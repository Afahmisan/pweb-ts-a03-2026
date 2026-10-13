import {
  ServiceType,
  Ticket,
  UserSession,
  Priority,
  QueueEvent,
  QueueEventType
} from './types.js';

const KEY_SESSION = 'hospital_session';
const KEY_SERVICES = 'hospital_services';
const KEY_TICKETS = 'hospital_tickets';
const KEY_COUNTERS = 'hospital_counters';
const BROADCAST_CHANNEL_NAME = 'hospital_queue_bus';

const memoryStore = new Map<string, string>();
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch {}
    return memoryStore.get(key) || null;
  },
  setItem: (key: string, val: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, val);
        return;
      }
    } catch {}
    memoryStore.set(key, val);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return;
      }
    } catch {}
    memoryStore.delete(key);
  }
};

// Default initial services matching Figma mockups
export const DEFAULT_SERVICES: ServiceType[] = [
  { id: 'srv-1', code: 'A', name: 'UMUM-1', isActive: true, createdAt: 1700000000000 },
  { id: 'srv-2', code: 'B', name: 'UMUM-2', isActive: true, createdAt: 1700000001000 },
  { id: 'srv-3', code: 'C', name: 'UMUM-3', isActive: true, createdAt: 1700000002000 },
  { id: 'srv-4', code: 'G', name: 'GIGI', isActive: true, createdAt: 1700000003000 },
  { id: 'srv-5', code: 'F', name: 'FARMASI', isActive: true, createdAt: 1700000004000 },
  { id: 'srv-6', code: 'P', name: 'PSIKOLOG', isActive: true, createdAt: 1700000005000 },
];

class StorageManager {
  private channel: BroadcastChannel | null = null;
  private listeners: Array<(event: QueueEvent) => void> = [];

  constructor() {
    this.initDefaults();
    this.initBroadcastChannel();
    this.initStorageEventListener();
  }

  private initDefaults(): void {
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

  private initBroadcastChannel(): void {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.channel.onmessage = (messageEvent) => {
          const event: QueueEvent = messageEvent.data;
          this.notifyListeners(event);
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported or failed to initialize', e);
    }
  }

  private initStorageEventListener(): void {
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('storage', (e) => {
        if (
          e.key === KEY_TICKETS ||
          e.key === KEY_SERVICES ||
          e.key === KEY_COUNTERS ||
          e.key === KEY_SESSION
        ) {
          this.notifyListeners({
            type: 'SERVICE_UPDATED',
            timestamp: Date.now(),
          });
        }
      });
    }
  }

  public notifyListeners(event: QueueEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in storage listener:', err);
      }
    }
  }

  public publishEvent(type: QueueEventType, payload?: any): void {
    const event: QueueEvent = {
      type,
      payload,
      timestamp: Date.now(),
    };
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch (err) {
        console.warn('Failed to broadcast event:', err);
      }
    }
    // Also trigger local listeners
    this.notifyListeners(event);
  }

  public subscribe(listener: (event: QueueEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getSession(): UserSession | null {
    try {
      const raw = safeStorage.getItem(KEY_SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public setSession(session: UserSession): void {
    safeStorage.setItem(KEY_SESSION, JSON.stringify(session));
    this.publishEvent('SERVICE_UPDATED', { session });
  }

  public clearSession(): void {
    safeStorage.removeItem(KEY_SESSION);
    this.publishEvent('SERVICE_UPDATED', { session: null });
  }

  public getServices(): ServiceType[] {
    try {
      const raw = safeStorage.getItem(KEY_SERVICES);
      return raw ? JSON.parse(raw) : DEFAULT_SERVICES;
    } catch {
      return DEFAULT_SERVICES;
    }
  }

  public saveServices(services: ServiceType[]): void {
    safeStorage.setItem(KEY_SERVICES, JSON.stringify(services));
    this.publishEvent('SERVICE_UPDATED');
  }

  public addService(code: string, name: string): { success: boolean; message?: string; service?: ServiceType } {
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
    const duplicateCode = currentServices.some(
      (s) => s.code.toUpperCase() === trimmedCode
    );
    if (duplicateCode) {
      return { success: false, message: `Kode antrian '${trimmedCode}' sudah digunakan!` };
    }

    // Check duplicate name (case-insensitive)
    const duplicateName = currentServices.some(
      (s) => s.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateName) {
      return { success: false, message: `Nama layanan '${trimmedName}' sudah digunakan!` };
    }

    const newService: ServiceType = {
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

  public toggleServiceActive(serviceId: string): ServiceType | null {
    const services = this.getServices();
    const target = services.find((s) => s.id === serviceId);
    if (target) {
      target.isActive = !target.isActive;
      this.saveServices(services);
      return target;
    }
    return null;
  }

  public deleteService(serviceId: string): boolean {
    const services = this.getServices();
    const filtered = services.filter((s) => s.id !== serviceId);
    if (filtered.length !== services.length) {
      this.saveServices(filtered);
      return true;
    }
    return false;
  }

  public updateServiceName(serviceId: string, newName: string): { success: boolean; message?: string } {
    const trimmed = newName.trim();
    if (!trimmed) {
      return { success: false, message: 'Nama layanan tidak boleh kosong.' };
    }
    const services = this.getServices();
    const target = services.find((s) => s.id === serviceId);
    if (!target) {
      return { success: false, message: 'Layanan tidak ditemukan.' };
    }
    const duplicate = services.some(
      (s) => s.id !== serviceId && s.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      return { success: false, message: `Nama layanan '${trimmed}' sudah digunakan!` };
    }
    target.name = trimmed;
    this.saveServices(services);
    return { success: true };
  }

  public getTickets(): Ticket[] {
    try {
      const raw = safeStorage.getItem(KEY_TICKETS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveTickets(tickets: Ticket[]): void {
    safeStorage.setItem(KEY_TICKETS, JSON.stringify(tickets));
  }

  private getCounters(): Record<string, number> {
    try {
      const raw = safeStorage.getItem(KEY_COUNTERS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveCounters(counters: Record<string, number>): void {
    safeStorage.setItem(KEY_COUNTERS, JSON.stringify(counters));
  }

  public getNextTicketNumber(serviceCode: string): string {
    const counters = this.getCounters();
    const currentCount = (counters[serviceCode] || 0) + 1;
    counters[serviceCode] = currentCount;
    this.saveCounters(counters);

    const formattedNumber = String(currentCount).padStart(3, '0');
    return `${serviceCode}-${formattedNumber}`;
  }

  public createTicket(serviceCode: string, priority: Priority): Ticket | null {
    const services = this.getServices();
    const service = services.find((s) => s.code === serviceCode && s.isActive);
    if (!service) {
      return null;
    }

    const ticketNumber = this.getNextTicketNumber(serviceCode);
    const newTicket: Ticket = {
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

  public updateTicketStatus(ticketId: string, status: Ticket['status']): Ticket | null {
    const tickets = this.getTickets();
    const target = tickets.find((t) => t.id === ticketId);
    if (!target) return null;

    target.status = status;
    if (status === 'DIPANGGIL') {
      target.calledAt = Date.now();
      target.recalledCount = 1;
    } else if (status === 'SELESAI') {
      target.completedAt = Date.now();
    }

    this.saveTickets(tickets);

    const eventType: QueueEventType =
      status === 'DIPANGGIL'
        ? 'TICKET_CALLED'
        : status === 'SELESAI'
        ? 'TICKET_COMPLETED'
        : 'TICKET_SKIPPED';

    this.publishEvent(eventType, target);
    return target;
  }

  public recallTicket(ticketId: string): Ticket | null {
    const tickets = this.getTickets();
    const target = tickets.find((t) => t.id === ticketId);
    if (!target) return null;

    target.recalledCount = (target.recalledCount || 1) + 1;
    target.calledAt = Date.now();
    this.saveTickets(tickets);

    this.publishEvent('TICKET_RECALLED', target);
    return target;
  }

  public resetQueue(): void {
    // Clear all tickets and counters
    this.saveTickets([]);
    this.saveCounters({});
    this.publishEvent('QUEUE_RESET');
  }
}

export const storage = new StorageManager();
