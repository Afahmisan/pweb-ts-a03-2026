import { PRIORITY_CONFIGS } from '../models/types.js';
import { StorageService } from './storage.js';
import { QueueService } from './queue.js';
export class ExportService {
    /**
     * Format timestamp ke string tanggal dan jam lokal standar (YYYY-MM-DD HH:mm:ss)
     */
    static formatDateTime(timestamp) {
        if (!timestamp || typeof timestamp !== 'number' || isNaN(timestamp) || timestamp <= 0) {
            return '-';
        }
        const date = new Date(timestamp);
        if (isNaN(date.getTime()))
            return '-';
        const pad = (n) => String(n).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    /**
     * Format tanggal untuk penamaan file ekspor (YYYY-MM-DD)
     */
    static formatDateForFilename(date = new Date()) {
        const pad = (n) => String(n).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        return `${year}-${month}-${day}`;
    }
    /**
     * Escape sel CSV mengikuti standar RFC 4180
     */
    static escapeCsvCell(value) {
        if (value === null || value === undefined) {
            return '""';
        }
        const str = String(value);
        return `"${str.replace(/"/g, '""')}"`;
    }
    /**
     * Menghasilkan teks CSV dari daftar tiket antrean
     */
    static generateCsv(tickets) {
        const headerRow = this.CSV_HEADERS.map(h => this.escapeCsvCell(h)).join(',');
        const rows = [headerRow];
        for (const ticket of tickets) {
            const priorityLabel = PRIORITY_CONFIGS[ticket.priority]?.label || ticket.priority;
            const statusLabel = this.STATUS_LABELS[ticket.status] || ticket.status;
            const counterLabel = ticket.counterName || '-';
            const createdAtStr = this.formatDateTime(ticket.createdAt);
            const calledAtStr = ticket.calledAt ? this.formatDateTime(ticket.calledAt) : '-';
            const completedAtStr = ticket.completedAt ? this.formatDateTime(ticket.completedAt) : '-';
            const row = [
                this.escapeCsvCell(ticket.ticketNumber),
                this.escapeCsvCell(ticket.serviceName),
                this.escapeCsvCell(priorityLabel),
                this.escapeCsvCell(statusLabel),
                this.escapeCsvCell(counterLabel),
                this.escapeCsvCell(createdAtStr),
                this.escapeCsvCell(calledAtStr),
                this.escapeCsvCell(completedAtStr)
            ];
            rows.push(row.join(','));
        }
        return rows.join('\r\n');
    }
    /**
     * Menghasilkan string JSON untuk audit trail data antrean harian
     */
    static generateAuditTrailJson(tickets, services, stats, user) {
        const now = Date.now();
        const exportData = {
            metadata: {
                systemName: 'Klinik Medika Utama - Enterprise Queue System',
                branch: 'RS Medika Utama - Cabang Pusat Salemba',
                reportType: 'Daily Queue Audit Trail & Operational Report',
                exportedAt: new Date(now).toISOString(),
                exportedAtFormatted: this.formatDateTime(now),
                exportedBy: user ? `${user.firstName} ${user.lastName} (${user.role})` : 'Petugas Admisi / Admin',
                totalTickets: tickets.length
            },
            statistics: stats,
            services: services,
            tickets: tickets.map(t => ({
                ...t,
                priorityLabel: PRIORITY_CONFIGS[t.priority]?.label || t.priority,
                statusLabel: this.STATUS_LABELS[t.status] || t.status,
                createdAtFormatted: this.formatDateTime(t.createdAt),
                calledAtFormatted: t.calledAt ? this.formatDateTime(t.calledAt) : '-',
                completedAtFormatted: t.completedAt ? this.formatDateTime(t.completedAt) : '-'
            }))
        };
        return JSON.stringify(exportData, null, 2);
    }
    /**
     * Pemicu unduhan otomatis native browser via Data Blob
     */
    static triggerDownload(blob, filename) {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return;
        }
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            try {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }
            catch {
                // Ignore if element already detached
            }
        }, 150);
    }
    /**
     * Ekspor data antrean harian ke file CSV
     */
    static exportCsv(customTickets) {
        const tickets = customTickets ?? StorageService.getTickets();
        const csvContent = this.generateCsv(tickets);
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const filename = `laporan_antrian_harian_${this.formatDateForFilename()}.csv`;
        this.triggerDownload(blob, filename);
        return { filename, totalRecords: tickets.length, csvContent };
    }
    /**
     * Ekspor backup audit trail antrean harian ke file JSON
     */
    static exportJson(customTickets, customServices, customStats, customUser) {
        const tickets = customTickets ?? StorageService.getTickets();
        const services = customServices ?? StorageService.getServices();
        const stats = customStats ?? QueueService.getQueueStats();
        const user = customUser !== undefined ? customUser : StorageService.getAuthUser();
        const jsonContent = this.generateAuditTrailJson(tickets, services, stats, user);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const filename = `audit_trail_antrian_${this.formatDateForFilename()}.json`;
        this.triggerDownload(blob, filename);
        return { filename, totalRecords: tickets.length, jsonContent };
    }
}
ExportService.CSV_HEADERS = [
    'Nomor Tiket',
    'Layanan',
    'Prioritas',
    'Status',
    'Loket Pemanggil',
    'Waktu Buat',
    'Waktu Panggil',
    'Waktu Selesai'
];
ExportService.STATUS_LABELS = {
    waiting: 'Menunggu',
    calling: 'Sedang Dipanggil',
    done: 'Selesai',
    skipped: 'Dilewati'
};
