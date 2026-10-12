import { normalizePriority, getPriorityOrder } from '../models/types.js';
import { StorageService, getCounterForService } from './storage.js';
export class QueueService {
    /**
     * Mengurutkan tiket sesuai aturan prioritas klinis:
     * 1. Bobot/Tier Prioritas: VIP (Tier 1) > Disabilitas (Tier 2) > Lansia (Tier 3) > Normal (Tier 4)
     * 2. FIFO (First In First Out) berdasarkan waktu pembuatan tiket (createdAt)
     */
    static sortTickets(a, b) {
        const tierA = getPriorityOrder(a.priority);
        const tierB = getPriorityOrder(b.priority);
        if (tierA !== tierB) {
            return tierA - tierB; // Nilai tier lebih kecil (1 = VIP) dipanggil terlebih dahulu
        }
        const timeA = typeof a.createdAt === 'number' ? a.createdAt : Number(a.createdAt) || 0;
        const timeB = typeof b.createdAt === 'number' ? b.createdAt : Number(b.createdAt) || 0;
        return timeA - timeB; // FIFO jika tingkat prioritas setara
    }
    /**
     * Menerbitkan tiket baru untuk layanan aktif
     */
    static generateTicket(serviceCode, priority, meta) {
        const cleanCode = serviceCode.trim().toUpperCase();
        const services = StorageService.getServices();
        const service = services.find(s => s.code.toUpperCase() === cleanCode);
        if (!service) {
            throw new Error(`Jenis layanan dengan kode [${cleanCode}] tidak ditemukan.`);
        }
        if (!service.isActive) {
            throw new Error(`Layanan [${cleanCode}] - ${service.name} saat ini sedang dinonaktifkan oleh administrator.`);
        }
        // Validasi kuota 1 user = 1 tiket aktif
        if (meta && (meta.username || meta.userId) && !meta.isManualByAdmin) {
            const userKey = meta.username || meta.userId || '';
            if (this.hasActiveTicket(userKey) || (meta.userId && this.hasActiveTicket(meta.userId))) {
                throw new Error('Anda sudah memiliki tiket aktif. Selesaikan antrian atau batalkan tiket terlebih dahulu.');
            }
        }
        // Increment nomor urut
        service.currentNumber = (Number(service.currentNumber) || 0) + 1;
        StorageService.saveServices(services);
        const formattedSeq = String(service.currentNumber).padStart(3, '0');
        const ticketNumber = `${service.code}-${formattedSeq}`;
        const newTicket = {
            id: `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            ticketNumber,
            sequence: service.currentNumber,
            serviceCode: service.code,
            serviceName: service.name,
            priority: normalizePriority(priority),
            status: 'waiting',
            createdAt: Date.now(),
            userId: meta?.userId,
            username: meta?.username,
            isManualByAdmin: meta?.isManualByAdmin
        };
        StorageService.addTicket(newTicket);
        return newTicket;
    }
    /**
     * Memeriksa apakah pengguna memiliki tiket antrean yang masih aktif (waiting atau calling)
     */
    static hasActiveTicket(usernameOrId) {
        return this.getUserActiveTicket(usernameOrId) !== null;
    }
    /**
     * Mengambil tiket aktif (status 'waiting' atau 'calling') milik pengguna
     */
    static getUserActiveTicket(usernameOrId) {
        if (!usernameOrId)
            return null;
        const tickets = StorageService.getTickets();
        const target = tickets.find(t => (t.status === 'waiting' || t.status === 'calling') &&
            (t.username === usernameOrId || t.userId === usernameOrId));
        return target || null;
    }
    /**
     * Membatalkan / drop tiket antrean oleh pasien (status -> 'skipped')
     */
    static dropTicket(ticketId) {
        const tickets = StorageService.getTickets();
        const target = tickets.find(t => t.id === ticketId);
        if (!target) {
            throw new Error('Tiket dengan ID tidak ditemukan.');
        }
        target.status = 'skipped';
        target.completedAt = Date.now();
        const currentActive = StorageService.getActiveTicket();
        if (currentActive && currentActive.id === target.id) {
            StorageService.setActiveTicket(null);
        }
        StorageService.updateTicket(target);
        StorageService.notifyChange();
        return target;
    }
    /**
     * Menghitung berapa banyak tiket berstatus 'waiting' di depan tiket ini
     */
    static getAheadCount(ticketId) {
        const tickets = StorageService.getTickets();
        const target = tickets.find(t => t.id === ticketId);
        if (!target || target.status !== 'waiting') {
            return 0;
        }
        const waitingSameService = tickets
            .filter(t => t.status === 'waiting' && t.serviceCode.toUpperCase() === target.serviceCode.toUpperCase())
            .sort((a, b) => QueueService.sortTickets(a, b));
        const index = waitingSameService.findIndex(t => t.id === ticketId);
        return index > 0 ? index : 0;
    }
    /**
     * Mengambil daftar tiket yang sedang menunggu antrean
     */
    static getWaitingTickets(serviceCode) {
        const cleanCode = serviceCode ? serviceCode.trim().toUpperCase() : undefined;
        const tickets = StorageService.getTickets();
        return tickets
            .filter(t => t.status === 'waiting' && (!cleanCode || t.serviceCode.toUpperCase() === cleanCode))
            .sort((a, b) => QueueService.sortTickets(a, b));
    }
    /**
     * Memanggil tiket antrean berikutnya:
     * - Menutup tiket aktif sebelumnya (status -> 'done')
     * - Memanggil tiket teratas dari daftar tunggu
     */
    static callNextTicket(counterName, serviceCode) {
        const cleanCode = serviceCode ? serviceCode.trim().toUpperCase() : undefined;
        const currentActive = StorageService.getActiveTicket();
        if (currentActive && (!cleanCode || currentActive.serviceCode.toUpperCase() === cleanCode)) {
            currentActive.status = 'done';
            currentActive.completedAt = Date.now();
            StorageService.updateTicket(currentActive);
            StorageService.setActiveTicket(null);
        }
        const waiting = this.getWaitingTickets(cleanCode);
        if (waiting.length === 0) {
            return null;
        }
        const nextTicket = waiting[0];
        if (nextTicket.status !== 'waiting') {
            return null;
        }
        const effectiveCounter = (!counterName || counterName.toLowerCase().includes('semua') || counterName.toLowerCase().includes('otomatis'))
            ? getCounterForService(nextTicket.serviceCode)
            : counterName;
        nextTicket.status = 'calling';
        nextTicket.counterName = effectiveCounter;
        nextTicket.calledAt = Date.now();
        StorageService.updateTicket(nextTicket);
        StorageService.setActiveTicket(nextTicket);
        return nextTicket;
    }
    /**
     * Memanggil tiket tertentu berdasarkan ID (hanya jika berstatus 'waiting')
     */
    static callTicketById(id, counterName) {
        const tickets = StorageService.getTickets();
        const target = tickets.find(t => t.id === id);
        if (!target || target.status !== 'waiting') {
            return null;
        }
        const currentActive = StorageService.getActiveTicket();
        if (currentActive) {
            currentActive.status = 'done';
            currentActive.completedAt = Date.now();
            StorageService.updateTicket(currentActive);
            StorageService.setActiveTicket(null);
        }
        const effectiveCounter = (!counterName || counterName.toLowerCase().includes('semua') || counterName.toLowerCase().includes('otomatis'))
            ? getCounterForService(target.serviceCode)
            : counterName;
        target.status = 'calling';
        target.counterName = effectiveCounter;
        target.calledAt = Date.now();
        StorageService.updateTicket(target);
        StorageService.setActiveTicket(target);
        return target;
    }
    /**
     * Melewati tiket yang sedang dipanggil (status -> 'skipped')
     */
    static skipCurrentTicket() {
        const currentActive = StorageService.getActiveTicket();
        if (!currentActive)
            return null;
        currentActive.status = 'skipped';
        currentActive.completedAt = Date.now();
        StorageService.updateTicket(currentActive);
        StorageService.setActiveTicket(null);
        return currentActive;
    }
    /**
     * Menyelesaikan tiket yang sedang dipanggil (status -> 'done') tanpa otomatis memanggil tiket berikutnya
     */
    static completeCurrentTicket() {
        const currentActive = StorageService.getActiveTicket();
        if (!currentActive)
            return null;
        currentActive.status = 'done';
        currentActive.completedAt = Date.now();
        StorageService.updateTicket(currentActive);
        StorageService.setActiveTicket(null);
        return currentActive;
    }
    static skipTicket(id) {
        if (!id)
            return this.skipCurrentTicket();
        const tickets = StorageService.getTickets();
        const target = tickets.find(t => t.id === id);
        if (!target)
            return null;
        target.status = 'skipped';
        target.completedAt = Date.now();
        StorageService.updateTicket(target);
        const active = StorageService.getActiveTicket();
        if (active && active.id === id) {
            StorageService.setActiveTicket(null);
        }
        return target;
    }
    static completeTicket(id) {
        if (!id)
            return this.completeCurrentTicket();
        const tickets = StorageService.getTickets();
        const target = tickets.find(t => t.id === id);
        if (!target)
            return null;
        target.status = 'done';
        target.completedAt = Date.now();
        StorageService.updateTicket(target);
        const active = StorageService.getActiveTicket();
        if (active && active.id === id) {
            StorageService.setActiveTicket(null);
        }
        return target;
    }
    /**
     * Panggil ulang tiket aktif saat ini
     */
    static recallCurrentTicket() {
        const currentActive = StorageService.getActiveTicket();
        if (!currentActive)
            return null;
        currentActive.calledAt = Date.now();
        StorageService.updateTicket(currentActive);
        StorageService.setActiveTicket(currentActive);
        return currentActive;
    }
    /**
     * Mengumpulkan statistik antrean keseluruhan
     */
    static getQueueStats() {
        const tickets = StorageService.getTickets();
        const services = StorageService.getServices();
        return {
            totalTicketsToday: tickets.length,
            totalWaiting: tickets.filter(t => t.status === 'waiting').length,
            totalCalling: tickets.filter(t => t.status === 'calling').length,
            totalDone: tickets.filter(t => t.status === 'done').length,
            totalSkipped: tickets.filter(t => t.status === 'skipped').length,
            totalActiveServices: services.filter(s => s.isActive).length
        };
    }
    /**
     * Mengambil ringkasan antrean per poli untuk Layar TV dan Admin
     */
    static getServiceSummary() {
        const services = StorageService.getServices();
        const tickets = StorageService.getTickets();
        const active = StorageService.getActiveTicket();
        return services.map(service => {
            const waitingCount = tickets.filter(t => t.serviceCode === service.code && t.status === 'waiting').length;
            const serviceActive = active && active.serviceCode === service.code ? active : null;
            return {
                service,
                waitingCount,
                activeTicket: serviceActive
            };
        });
    }
    /**
     * Mentransfer pasien aktif ke poliklinik/layanan lain (misal dari Poli Umum ke Farmasi atau Poli Spesialis):
     * 1. Menyelesaikan tiket aktif saat ini di loket asal (status -> 'done', completedAt -> Date.now())
     * 2. Mengosongkan activeTicket di StorageService
     * 3. Menerbitkan tiket baru di layanan tujuan (QueueService.generateTicket) dengan MEMPERTAHANKAN prioritas pasien asal (VIP, Lansia, Disabilitas, Normal)
     * 4. Menyimpan dan menyinkronkan perubahan ke localStorage & event sync
     * 5. Mengembalikan { oldTicket, newTicket }
     */
    static transferTicket(currentTicketId, targetServiceCode, notes) {
        const cleanTargetCode = targetServiceCode.trim().toUpperCase();
        const tickets = StorageService.getTickets();
        const activeTicket = StorageService.getActiveTicket();
        let currentTicket = tickets.find(t => t.id === currentTicketId);
        if (!currentTicket && activeTicket && (activeTicket.id === currentTicketId || !currentTicketId)) {
            currentTicket = activeTicket;
        }
        if (!currentTicket) {
            throw new Error(`Tiket aktif dengan ID [${currentTicketId}] tidak ditemukan.`);
        }
        // 1. Menyelesaikan tiket aktif saat ini di loket asal
        currentTicket.status = 'done';
        currentTicket.completedAt = Date.now();
        StorageService.updateTicket(currentTicket);
        // 2. Mengosongkan activeTicket di StorageService
        StorageService.setActiveTicket(null);
        // 3. Menerbitkan tiket baru di layanan tujuan dengan MEMPERTAHANKAN prioritas pasien asal
        const newTicket = QueueService.generateTicket(cleanTargetCode, currentTicket.priority, {
            userId: currentTicket.userId,
            username: currentTicket.username,
            isManualByAdmin: currentTicket.isManualByAdmin
        });
        if (notes) {
            newTicket.notes = notes;
            StorageService.updateTicket(newTicket);
        }
        // 4. Menyimpan dan menyinkronkan perubahan ke localStorage & event sync
        StorageService.notifyChange();
        // 5. Mengembalikan { oldTicket, newTicket }
        return {
            oldTicket: currentTicket,
            newTicket
        };
    }
}
