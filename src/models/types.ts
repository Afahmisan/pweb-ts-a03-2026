export type UserRole = 'admin' | 'moderator' | 'operator' | 'user';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: string;
  image: string;
  token: string;
  role: UserRole;
  assignedCounter?: string;
}

export interface CustomUser {
  id: number;
  fullName: string;
  username: string;
  password?: string;
  role: UserRole;
  createdAt: number;
}

export interface AuthResponse {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: string;
  image: string;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  role?: string;
}

export type QueuePriority = 'vip' | 'disabilitas' | 'lansia' | 'normal';

export interface PriorityConfig {
  key: QueuePriority;
  label: string;
  weight: number;
  badgeClass: string;
  description: string;
}

export const PRIORITY_CONFIGS: Record<QueuePriority, PriorityConfig> = {
  vip: {
    key: 'vip',
    label: 'VIP',
    weight: 1, // Tier 1 (Utama)
    badgeClass: 'badge--vip',
    description: 'Jalur Eksekutif & Darurat Khusus'
  },
  disabilitas: {
    key: 'disabilitas',
    label: 'Disabilitas',
    weight: 2, // Tier 2
    badgeClass: 'badge--disability',
    description: 'Prioritas Difabel & Kebutuhan Khusus'
  },
  lansia: {
    key: 'lansia',
    label: 'Lansia',
    weight: 3, // Tier 3
    badgeClass: 'badge--elderly',
    description: 'Prioritas Lanjut Usia (≥ 60 Tahun)'
  },
  normal: {
    key: 'normal',
    label: 'Normal',
    weight: 4, // Tier 4
    badgeClass: 'badge--normal',
    description: 'Pasien Rawat Jalan Standar'
  }
};

export function normalizePriority(p: unknown): QueuePriority {
  if (!p) return 'normal';
  const s = String(p).toLowerCase().trim();
  if (s.includes('vip') || s.includes('exec') || s.includes('fast')) return 'vip';
  if (s.includes('disab') || s.includes('difabel') || s.includes('khusus')) return 'disabilitas';
  if (s.includes('lan') || s.includes('geriatri') || s.includes('elderly') || s.includes('ibu')) return 'lansia';
  return 'normal';
}

export function getPriorityOrder(p: unknown): number {
  const norm = normalizePriority(p);
  switch (norm) {
    case 'vip':
      return 1;
    case 'disabilitas':
      return 2;
    case 'lansia':
      return 3;
    case 'normal':
    default:
      return 4;
  }
}

export interface ServiceType {
  code: string; // 1 Uppercase Letter, unique
  name: string; // Service Name e.g. "Poli Umum"
  isActive: boolean;
  currentNumber: number; // Sequence tracker
}

export type TicketStatus = 'waiting' | 'calling' | 'done' | 'skipped';

export interface Ticket {
  id: string;
  ticketNumber: string; // e.g. "A-001"
  sequence: number;
  serviceCode: string;
  serviceName: string;
  priority: QueuePriority;
  status: TicketStatus;
  counterName?: string;
  createdAt: number;
  calledAt?: number;
  completedAt?: number;
  notes?: string;
  userId?: string;
  username?: string;
  isManualByAdmin?: boolean;
}

export interface QueueStats {
  totalTicketsToday: number;
  totalWaiting: number;
  totalCalling: number;
  totalDone: number;
  totalSkipped: number;
  totalActiveServices: number;
}

export type AssistanceStatus = 'pending' | 'resolved';

export interface AssistanceRequest {
  id: string;
  source: string; // e.g. "Kiosk Pasien 02 (Lobby Utama)"
  timestamp: number;
  status: AssistanceStatus;
  handledAt?: number;
  handledBy?: string; // e.g. "dr. Hendra S. (Admin)"
  notes?: string;
}
