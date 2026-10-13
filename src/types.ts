export type Role = 'admin' | 'moderator' | 'user';

export interface UserSession {
  token: string;
  role: Role;
  firstName: string;
  username: string;
  email?: string;
  image?: string;
}

export type Priority = 'VIP' | 'Disabilitas' | 'Lansia' | 'Normal';

export const PRIORITY_WEIGHTS: Record<Priority, number> = {
  VIP: 4,
  Disabilitas: 3,
  Lansia: 2,
  Normal: 1,
};

export type TicketStatus = 'MENUNGGU' | 'DIPANGGIL' | 'SELESAI' | 'DILEWATI';

export interface ServiceType {
  id: string;
  code: string;       // 1 uppercase letter, e.g. 'A', 'B', 'C', 'G', 'F', 'P'
  name: string;       // e.g. 'UMUM-1', 'GIGI', 'FARMASI'
  isActive: boolean;
  createdAt: number;
}

export interface Ticket {
  id: string;
  ticketNumber: string; // e.g. 'A-001'
  serviceCode: string;
  serviceName: string;
  priority: Priority;
  status: TicketStatus;
  createdAt: number;
  calledAt?: number;
  completedAt?: number;
  recalledCount?: number;
}

export type QueueEventType =
  | 'TICKET_CREATED'
  | 'TICKET_CALLED'
  | 'TICKET_RECALLED'
  | 'TICKET_COMPLETED'
  | 'TICKET_SKIPPED'
  | 'SERVICE_UPDATED'
  | 'QUEUE_RESET';

export interface QueueEvent {
  type: QueueEventType;
  payload?: any;
  timestamp: number;
}
