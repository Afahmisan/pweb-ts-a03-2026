const KEY_SESSION = 'hospital_session';
const KEY_SERVICES = 'hospital_services';
const KEY_TICKETS = 'hospital_tickets';
const KEY_COUNTERS = 'hospital_counters';
const BROADCAST_CHANNEL_NAME = 'hospital_queue_bus';
const memoryStore = new Map();
const safeStorage = {
    getItem: (key) => {
        try {
            if (typeof localStorage !== 'undefined')
                return localStorage.getItem(key);
        }
        catch { }
        return memoryStore.get(key) || null;
    },
    setItem: (key, val) => {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(key, val);
                return;
            }
        }
        catch { }
        memoryStore.set(key, val);
    },
    removeItem: (key) => {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(key);
                return;
            }
        }
        catch { }
        memoryStore.delete(key);
    }
};
// Default initial services matching Figma mockups
export const DEFAULT_SERVICES = [
    { id: 'srv-1', code: 'A', name: 'UMUM-1', isActive: true, createdAt: 1700000000000 },
    { id: 'srv-2', code: 'B', name: 'UMUM-2', isActive: true, createdAt: 1700000001000 },
    { id: 'srv-3', code: 'C', name: 'UMUM-3', isActive: true, createdAt: 1700000002000 },
    { id: 'srv-4', code: 'G', name: 'GIGI', isActive: true, createdAt: 1700000003000 },
    { id: 'srv-5', code: 'F', name: 'FARMASI', isActive: true, createdAt: 1700000004000 },
    { id: 'srv-6', code: 'P', name: 'PSIKOLOG', isActive: true, createdAt: 1700000005000 },
];
class StorageManager {
    constructor() {
        this.channel = null;
        this.listeners = [];
        this.initDefaults();
        this.initBroadcastChannel();
        this.initStorageEventListener();
    }
    initDefaults() {
        if (!safeStorage.getItem(KEY_SERVICES)) {
            safeStorage.setItem(KEY_SERVICES, JSON.stringify(DEFAULT_SERVICES));
        }
        if (!safeStorage.getItem(KEY_TICKETS)) {
            safeStorage.setItem(KEY_TICKETS, JSON.stringify([]));
        }
        if (!safeStorage.getItem(KEY_COUNTERS)) {
            safeStorage.setItem(KEY_COUNTERS, JSON.stringify({}));
        }
    }
    initBroadcastChannel() {
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
                this.channel.onmessage = (messageEvent) => {
                    const event = messageEvent.data;
                    this.notifyListeners(event);
                };
            }
        }
        catch (e) {
            console.warn('BroadcastChannel not supported or failed to initialize', e);
        }
    }
    initStorageEventListener() {
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('storage', (e) => {
                if (e.key === KEY_TICKETS ||
                    e.key === KEY_SERVICES ||
                    e.key === KEY_COUNTERS ||
                    e.key === KEY_SESSION) {
                    this.notifyListeners({
                        type: 'SERVICE_UPDATED',
                        timestamp: Date.now(),
                    });
                }
            });
        }
    }
    notifyListeners(event) {
        for (const listener of this.listeners) {
            try {
                listener(event);
            }
            catch (err) {
                console.error('Error in storage listener:', err);
            }
        }
    }
    publishEvent(type, payload) {
        const event = {
            type,
            payload,
            timestamp: Date.now(),
        };
        if (this.channel) {
            try {
                this.channel.postMessage(event);
            }
            catch (err) {
                console.warn('Failed to broadcast event:', err);
            }
        }
        // Also trigger local listeners
        this.notifyListeners(event);
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    getSession() {
        try {
            const raw = safeStorage.getItem(KEY_SESSION);
            return raw ? JSON.parse(raw) : null;
        }
        catch {
            return null;
        }
    }
    setSession(session) {
        safeStorage.setItem(KEY_SESSION, JSON.stringify(session));
        this.publishEvent('SERVICE_UPDATED', { session });
    }
    clearSession() {
        safeStorage.removeItem(KEY_SESSION);
        this.publishEvent('SERVICE_UPDATED', { session: null });
    }
    getServices() {
        try {
            const raw = safeStorage.getItem(KEY_SERVICES);
            return raw ? JSON.parse(raw) : DEFAULT_SERVICES;
        }
        catch {
            return DEFAULT_SERVICES;
        }
    }
    saveServices(services) {
        safeStorage.setItem(KEY_SERVICES, JSON.stringify(services));
        this.publishEvent('SERVICE_UPDATED');
    }
    addService(code, name) {
        const trimmedCode = code.trim().toUpperCase();
        const trimmedName = name.trim();
        if (!/^[A-Z]$/.test(trimmedCode)) {
            return { success: false, message: 'Kode layanan harus berupa 1 huruf kapital (A-Z).' };
        }
        if (!trimmedName) {
            return { success: false, message: 'Nama layanan tidak boleh kosong.' };
        }
        const currentServices = this.getServices();
        // Check duplicate code (case-insensitive)
        const duplicateCode = currentServices.some((s) => s.code.toUpperCase() === trimmedCode);
        if (duplicateCode) {
            return { success: false, message: `Kode antrian '${trimmedCode}' sudah digunakan!` };
        }
        // Check duplicate name (case-insensitive)
        const duplicateName = currentServices.some((s) => s.name.trim().toLowerCase() === trimmedName.toLowerCase());
        if (duplicateName) {
            return { success: false, message: `Nama layanan '${trimmedName}' sudah digunakan!` };
        }
        const newService = {
            id: 'srv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            code: trimmedCode,
            name: trimmedName,
            isActive: true,
            createdAt: Date.now(),
        };
        currentServices.push(newService);
        this.saveServices(currentServices);
        return { success: true, service: newService };
    }
    toggleServiceActive(serviceId) {
        const services = this.getServices();
        const target = services.find((s) => s.id === serviceId);
        if (target) {
            target.isActive = !target.isActive;
            this.saveServices(services);
            return target;
        }
        return null;
    }
    deleteService(serviceId) {
        const services = this.getServices();
        const filtered = services.filter((s) => s.id !== serviceId);
        if (filtered.length !== services.length) {
            this.saveServices(filtered);
            return true;
        }
        return false;
    }
    updateServiceName(serviceId, newName) {
        const trimmed = newName.trim();
        if (!trimmed) {
            return { success: false, message: 'Nama layanan tidak boleh kosong.' };
        }
        const services = this.getServices();
        const target = services.find((s) => s.id === serviceId);
        if (!target) {
            return { success: false, message: 'Layanan tidak ditemukan.' };
        }
        const duplicate = services.some((s) => s.id !== serviceId && s.name.trim().toLowerCase() === trimmed.toLowerCase());
        if (duplicate) {
            return { success: false, message: `Nama layanan '${trimmed}' sudah digunakan!` };
        }
        target.name = trimmed;
        this.saveServices(services);
        return { success: true };
    }
    getTickets() {
        try {
            const raw = safeStorage.getItem(KEY_TICKETS);
            return raw ? JSON.parse(raw) : [];
        }
        catch {
            return [];
        }
    }
    saveTickets(tickets) {
        safeStorage.setItem(KEY_TICKETS, JSON.stringify(tickets));
    }
    getCounters() {
        try {
            const raw = safeStorage.getItem(KEY_COUNTERS);
            return raw ? JSON.parse(raw) : {};
        }
        catch {
            return {};
        }
    }
    saveCounters(counters) {
        safeStorage.setItem(KEY_COUNTERS, JSON.stringify(counters));
    }
    getNextTicketNumber(serviceCode) {
        const counters = this.getCounters();
        const currentCount = (counters[serviceCode] || 0) + 1;
        counters[serviceCode] = currentCount;
        this.saveCounters(counters);
        const formattedNumber = String(currentCount).padStart(3, '0');
        return `${serviceCode}-${formattedNumber}`;
    }
    createTicket(serviceCode, priority) {
        const services = this.getServices();
        const service = services.find((s) => s.code === serviceCode && s.isActive);
        if (!service) {
            return null;
        }
        const ticketNumber = this.getNextTicketNumber(serviceCode);
        const newTicket = {
            id: 'tkt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            ticketNumber,
            serviceCode: service.code,
            serviceName: service.name,
            priority,
            status: 'MENUNGGU',
            createdAt: Date.now(),
        };
        const tickets = this.getTickets();
        tickets.push(newTicket);
        this.saveTickets(tickets);
        this.publishEvent('TICKET_CREATED', newTicket);
        return newTicket;
    }
    updateTicketStatus(ticketId, status) {
        const tickets = this.getTickets();
        const target = tickets.find((t) => t.id === ticketId);
        if (!target)
            return null;
        target.status = status;
        if (status === 'DIPANGGIL') {
            target.calledAt = Date.now();
            target.recalledCount = 1;
        }
        else if (status === 'SELESAI') {
            target.completedAt = Date.now();
        }
        this.saveTickets(tickets);
        const eventType = status === 'DIPANGGIL'
            ? 'TICKET_CALLED'
            : status === 'SELESAI'
                ? 'TICKET_COMPLETED'
                : 'TICKET_SKIPPED';
        this.publishEvent(eventType, target);
        return target;
    }
    recallTicket(ticketId) {
        const tickets = this.getTickets();
        const target = tickets.find((t) => t.id === ticketId);
        if (!target)
            return null;
        target.recalledCount = (target.recalledCount || 1) + 1;
        target.calledAt = Date.now();
        this.saveTickets(tickets);
        this.publishEvent('TICKET_RECALLED', target);
        return target;
    }
    resetQueue() {
        // Clear all tickets and counters
        this.saveTickets([]);
        this.saveCounters({});
        this.publishEvent('QUEUE_RESET');
    }
}
export const storage = new StorageManager();
