import { UserProfile, ServiceType, Ticket, normalizePriority, AssistanceRequest, CustomUser, UserRole } from '../models/types.js';

const KEY_AUTH_USER = 'medika_auth_user';
const KEY_SERVICES = 'medika_services';
const KEY_TICKETS = 'medika_tickets';
const KEY_ACTIVE_TICKET = 'medika_active_ticket';
const KEY_LAST_CALL_EVENT = 'medika_last_call_event';
const KEY_ASSISTANCE = 'medika_assistance_requests';
const KEY_CUSTOM_USERS = 'medika_custom_users';

const DEFAULT_ASSISTANCE_REQUESTS: AssistanceRequest[] = [
  {
    id: 'ast-demo-01',
    source: 'Kiosk Mandiri 01 (Lobby Barat)',
    timestamp: Date.now() - 15 * 60 * 1000,
    status: 'resolved',
    handledAt: Date.now() - 12 * 60 * 1000,
    handledBy: 'dr. Hendra S. (Admin)'
  },
  {
    id: 'ast-demo-02',
    source: 'Kiosk Mandiri 02 (Lobby Admisi)',
    timestamp: Date.now() - 3 * 60 * 1000,
    status: 'pending'
  }
];

const DEFAULT_SERVICES: ServiceType[] = [
  { code: 'A', name: 'Poli Umum', isActive: true, currentNumber: 0 },
  { code: 'B', name: 'Poli Penyakit Dalam', isActive: true, currentNumber: 0 },
  { code: 'C', name: 'Poli Anak & Tumbuh Kembang', isActive: true, currentNumber: 0 },
  { code: 'D', name: 'Farmasi & Apotek Terpadu', isActive: true, currentNumber: 0 }
];

export class StorageService {
  public static notifyChange(key?: string): void {
    try {
      // Pemicu event storage sintetis untuk tab lokal dan multi-window sync
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('medika_storage_sync', { detail: { key } }));
      try {
        window.dispatchEvent(new StorageEvent('storage', {
          key: key || null,
          newValue: key ? localStorage.getItem(key) : null,
          storageArea: localStorage
        }));
      } catch {
        // Fallback for environments where StorageEvent constructor requires standard properties
      }
    } catch {
      // Ignore if not in browser context
    }
  }

  // --- AUTHENTICATION ---
  public static getAuthUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(KEY_AUTH_USER);
      if (raw) return JSON.parse(raw);

      // Fallback if token or role are stored directly
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const role = localStorage.getItem('role');
      if (token && role) {
        return {
          id: 1,
          username: localStorage.getItem('username') || 'user',
          email: localStorage.getItem('email') || `${localStorage.getItem('username') || 'user'}@hospital.id`,
          firstName: localStorage.getItem('firstName') || 'User',
          lastName: '',
          gender: 'other',
          image: '',
          token: token,
          role: role as any
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  public static setAuthUser(user: UserProfile): void {
    localStorage.setItem(KEY_AUTH_USER, JSON.stringify(user));
    localStorage.setItem('accessToken', user.token);
    localStorage.setItem('token', user.token);
    localStorage.setItem('role', user.role);
    localStorage.setItem('firstName', user.firstName || user.username);
    localStorage.setItem('username', user.username);
    this.notifyChange(KEY_AUTH_USER);
  }

  public static clearAuthUser(): void {
    localStorage.removeItem(KEY_AUTH_USER);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('firstName');
    localStorage.removeItem('username');
    this.notifyChange(KEY_AUTH_USER);
  }

  // --- SERVICES CRUD ---
  public static getServices(): ServiceType[] {
    try {
      const raw = localStorage.getItem(KEY_SERVICES);
      if (!raw) {
        this.saveServices(DEFAULT_SERVICES);
        return DEFAULT_SERVICES;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.saveServices(DEFAULT_SERVICES);
        return DEFAULT_SERVICES;
      }
      return parsed.map((s: any) => ({
        code: String(s.code || '').toUpperCase().trim(),
        name: String(s.name || '').trim(),
        isActive: Boolean(s.isActive),
        currentNumber: Number(s.currentNumber) || 0
      }));
    } catch {
      return DEFAULT_SERVICES;
    }
  }

  public static saveServices(services: ServiceType[]): void {
    localStorage.setItem(KEY_SERVICES, JSON.stringify(services));
    this.notifyChange(KEY_SERVICES);
  }

  public static addService(code: string, name: string): boolean {
    const services = this.getServices();
    const upperCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (!upperCode || !cleanName) return false;
    if (upperCode.length !== 1 || !/^[A-Z]$/.test(upperCode)) return false;

    // Check duplicate code or name (case-insensitive)
    const duplicate = services.some(
      s => s.code.toUpperCase() === upperCode || s.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) return false;

    services.push({
      code: upperCode,
      name: cleanName,
      isActive: true,
      currentNumber: 0
    });

    this.saveServices(services);
    return true;
  }

  public static toggleService(code: string): boolean {
    const services = this.getServices();
    const target = services.find(s => s.code.toUpperCase() === code.toUpperCase());
    if (!target) return false;

    target.isActive = !target.isActive;
    this.saveServices(services);
    return true;
  }

  public static deleteService(code: string): boolean {
    const services = this.getServices();
    const filtered = services.filter(s => s.code.toUpperCase() !== code.toUpperCase());
    if (filtered.length === services.length) return false;

    this.saveServices(filtered);
    return true;
  }

  public static resetServiceCounter(code: string): boolean {
    const upperCode = code.toUpperCase();
    const services = this.getServices();
    const target = services.find(s => s.code.toUpperCase() === upperCode);
    if (!target) return false;

    target.currentNumber = 0;
    this.saveServices(services);

    // Empty active/waiting tickets for this specific service
    const tickets = this.getTickets();
    const remainingTickets = tickets.filter(t => t.serviceCode.toUpperCase() !== upperCode || t.status === 'done' || t.status === 'skipped');
    this.saveTickets(remainingTickets);

    const activeTicket = this.getActiveTicket();
    if (activeTicket && activeTicket.serviceCode.toUpperCase() === upperCode) {
      this.setActiveTicket(null);
    }

    this.notifyChange(KEY_SERVICES);
    return true;
  }

  public static resetServiceNumbers(): void {
    const services = this.getServices().map(s => ({
      ...s,
      currentNumber: 0
    }));
    this.saveServices(services);
    this.notifyChange(KEY_SERVICES);
  }

  // --- TICKETS MANAGEMENT ---
  public static getTickets(): Ticket[] {
    try {
      const raw = localStorage.getItem(KEY_TICKETS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((t: any) => ({
        ...t,
        id: String(t.id || `ticket_${Date.now()}`),
        ticketNumber: String(t.ticketNumber || ''),
        sequence: Number(t.sequence) || 0,
        serviceCode: String(t.serviceCode || '').toUpperCase().trim(),
        serviceName: String(t.serviceName || '').trim(),
        priority: normalizePriority(t.priority),
        status: (t.status || 'waiting') as any,
        counterName: t.counterName ? String(t.counterName) : undefined,
        createdAt: Number(t.createdAt) || Date.now(),
        calledAt: t.calledAt ? Number(t.calledAt) : undefined,
        completedAt: t.completedAt ? Number(t.completedAt) : undefined,
        notes: t.notes ? String(t.notes) : undefined
      }));
    } catch {
      return [];
    }
  }

  public static saveTickets(tickets: Ticket[]): void {
    localStorage.setItem(KEY_TICKETS, JSON.stringify(tickets));
    this.notifyChange(KEY_TICKETS);
  }

  public static addTicket(ticket: Ticket): void {
    const tickets = this.getTickets();
    tickets.push(ticket);
    this.saveTickets(tickets);
  }

  public static updateTicket(ticket: Ticket): void {
    const tickets = this.getTickets();
    const index = tickets.findIndex(t => t.id === ticket.id);
    if (index !== -1) {
      tickets[index] = ticket;
      this.saveTickets(tickets);
    }
  }

  public static clearAllTickets(): void {
    localStorage.removeItem(KEY_TICKETS);
    localStorage.removeItem(KEY_ACTIVE_TICKET);
    localStorage.removeItem(KEY_LAST_CALL_EVENT);
    this.resetServiceNumbers();
    this.notifyChange(KEY_TICKETS);
  }

  // --- ACTIVE TICKETS ---
  public static getActiveTicket(): Ticket | null {
    try {
      const raw = localStorage.getItem(KEY_ACTIVE_TICKET);
      if (!raw) return null;
      const t = JSON.parse(raw);
      if (!t || !t.id) return null;
      return {
        ...t,
        id: String(t.id),
        ticketNumber: String(t.ticketNumber || ''),
        sequence: Number(t.sequence) || 0,
        serviceCode: String(t.serviceCode || '').toUpperCase().trim(),
        serviceName: String(t.serviceName || '').trim(),
        priority: normalizePriority(t.priority),
        status: (t.status || 'calling') as any,
        counterName: t.counterName ? String(t.counterName) : undefined,
        createdAt: Number(t.createdAt) || Date.now(),
        calledAt: t.calledAt ? Number(t.calledAt) : undefined,
        completedAt: t.completedAt ? Number(t.completedAt) : undefined,
        notes: t.notes ? String(t.notes) : undefined
      };
    } catch {
      return null;
    }
  }

  public static setActiveTicket(ticket: Ticket | null): void {
    if (ticket) {
      localStorage.setItem(KEY_ACTIVE_TICKET, JSON.stringify(ticket));
      // Save call event timestamp to trigger sound in all open displays
      localStorage.setItem(KEY_LAST_CALL_EVENT, JSON.stringify({ ticket, timestamp: Date.now() }));
    } else {
      localStorage.removeItem(KEY_ACTIVE_TICKET);
    }
    this.notifyChange(KEY_ACTIVE_TICKET);
  }

  public static getLastCallEvent(): { ticket: Ticket; timestamp: number } | null {
    try {
      const raw = localStorage.getItem(KEY_LAST_CALL_EVENT);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.ticket) return null;
      return {
        ticket: {
          ...parsed.ticket,
          sequence: Number(parsed.ticket.sequence) || 0,
          createdAt: Number(parsed.ticket.createdAt) || Date.now(),
          calledAt: parsed.ticket.calledAt ? Number(parsed.ticket.calledAt) : undefined,
          completedAt: parsed.ticket.completedAt ? Number(parsed.ticket.completedAt) : undefined
        },
        timestamp: Number(parsed.timestamp) || Date.now()
      };
    } catch {
      return null;
    }
  }

  // --- ASSISTANCE CALL LOGS ---
  public static getAssistanceRequests(): AssistanceRequest[] {
    try {
      const raw = localStorage.getItem(KEY_ASSISTANCE);
      if (!raw) {
        this.saveAssistanceRequests(DEFAULT_ASSISTANCE_REQUESTS);
        return DEFAULT_ASSISTANCE_REQUESTS;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.saveAssistanceRequests(DEFAULT_ASSISTANCE_REQUESTS);
        return DEFAULT_ASSISTANCE_REQUESTS;
      }
      return parsed.map((item: any) => ({
        id: String(item.id || ''),
        source: String(item.source || 'Kiosk Mandiri'),
        timestamp: Number(item.timestamp) || Date.now(),
        status: (item.status === 'resolved' ? 'resolved' : 'pending') as any,
        handledAt: item.handledAt ? Number(item.handledAt) : undefined,
        handledBy: item.handledBy ? String(item.handledBy) : undefined,
        notes: item.notes ? String(item.notes) : undefined
      }));
    } catch {
      return DEFAULT_ASSISTANCE_REQUESTS;
    }
  }

  public static saveAssistanceRequests(requests: AssistanceRequest[]): void {
    localStorage.setItem(KEY_ASSISTANCE, JSON.stringify(requests));
    this.notifyChange(KEY_ASSISTANCE);
  }

  public static addAssistanceRequest(req: AssistanceRequest): void {
    const list = this.getAssistanceRequests();
    const updated = [req, ...list];
    this.saveAssistanceRequests(updated);
  }

  public static resolveAssistanceRequest(id: string, handledBy?: string): boolean {
    const list = this.getAssistanceRequests();
    const target = list.find(r => r.id === id);
    if (!target) return false;
    target.status = 'resolved';
    target.handledAt = Date.now();
    target.handledBy = handledBy || 'Petugas Medis';
    this.saveAssistanceRequests(list);
    return true;
  }

  // --- CUSTOM USERS MANAGEMENT ---
  public static getCustomUsers(): CustomUser[] {
    try {
      const raw = localStorage.getItem(KEY_CUSTOM_USERS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((u: any) => ({
        id: Number(u.id) || Date.now(),
        fullName: String(u.fullName || '').trim(),
        username: String(u.username || '').trim().toLowerCase(),
        password: String(u.password || ''),
        role: (u.role || 'user') as UserRole,
        createdAt: Number(u.createdAt) || Date.now()
      }));
    } catch {
      return [];
    }
  }

  public static saveCustomUsers(users: CustomUser[]): void {
    localStorage.setItem(KEY_CUSTOM_USERS, JSON.stringify(users));
    this.notifyChange(KEY_CUSTOM_USERS);
  }

  public static addCustomUser(userData: { fullName: string; username: string; password?: string; role: UserRole }): boolean {
    const users = this.getCustomUsers();
    const cleanUsername = userData.username.trim().toLowerCase();
    const cleanFullName = userData.fullName.trim();
    if (!cleanUsername || !cleanFullName) return false;

    // Cek duplikasi dengan custom user atau default credentials
    const demoUsernames = ['emilys', 'averyp', 'oliviaw', 'michaelw'];
    if (demoUsernames.includes(cleanUsername) || users.some(u => u.username.toLowerCase() === cleanUsername)) {
      return false;
    }

    const newUser: CustomUser = {
      id: Date.now(),
      fullName: cleanFullName,
      username: cleanUsername,
      password: userData.password ? userData.password.trim() : undefined,
      role: userData.role,
      createdAt: Date.now()
    };

    users.push(newUser);
    this.saveCustomUsers(users);
    return true;
  }

  public static deleteCustomUser(username: string): boolean {
    const users = this.getCustomUsers();
    const filtered = users.filter(u => u.username.toLowerCase() !== username.toLowerCase().trim());
    if (filtered.length === users.length) return false;
    this.saveCustomUsers(filtered);
    return true;
  }

  // --- SYNC SUBSCRIPTION ---
  public static onSync(callback: () => void): () => void {
    const handleStorage = (e: StorageEvent) => {
      if (
        !e.key ||
        e.key === KEY_SERVICES ||
        e.key === KEY_TICKETS ||
        e.key === KEY_ACTIVE_TICKET ||
        e.key === KEY_LAST_CALL_EVENT ||
        e.key === KEY_ASSISTANCE ||
        e.key === KEY_CUSTOM_USERS ||
        e.key.startsWith('medika_')
      ) {
        callback();
      }
    };

    const handleCustom = () => {
      callback();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('medika_storage_sync', handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('medika_storage_sync', handleCustom);
    };
  }

  public static getCounterForService(serviceCode: string): string {
    return getCounterForService(serviceCode);
  }
}

/**
 * Pemetaan loket dinamis sesuai urutan layanan terdaftar (Service-to-Counter Mapping)
 * - Poli Umum (A) -> Loket 01
 * - Poli Penyakit Dalam (B) -> Loket 02
 * - Poli Anak & Tumbuh Kembang (C) -> Loket 03
 * - Farmasi & Apotek Terpadu (D) -> Loket 04
 * - Poli ke-(i) -> Loket 0(i+1)
 */
export function getCounterForService(serviceCode: string): string {
  const clean = (serviceCode || '').trim().toUpperCase();
  try {
    const services = StorageService.getServices();
    const idx = services.findIndex(s => s.code.toUpperCase() === clean);
    if (idx !== -1) {
      const num = idx + 1;
      return num < 10 ? `Loket 0${num}` : `Loket ${num}`;
    }
  } catch {
    // Abaikan jika konteks storage belum siap
  }

  // Fallback standar berdasarkan huruf kode poli
  if (clean === 'B') return 'Loket 02';
  if (clean === 'C') return 'Loket 03';
  if (clean === 'D') return 'Loket 04';
  if (clean === 'E') return 'Loket 05';
  return 'Loket 01';
}
