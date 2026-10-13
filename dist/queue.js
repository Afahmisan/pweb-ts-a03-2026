import { PRIORITY_WEIGHTS } from './types.js';
import { storage } from './storage.js';
export class QueueManager {
    /**
     * Sort tickets according to Priority Queue algorithm:
     * 1. Priority Weight descending (VIP > Disabilitas > Lansia > Normal)
     * 2. FIFO (createdAt ascending) within the same priority level
     */
    static sortWaitingTickets(tickets) {
        return [...tickets].sort((a, b) => {
            const weightA = PRIORITY_WEIGHTS[a.priority] || 1;
            const weightB = PRIORITY_WEIGHTS[b.priority] || 1;
            if (weightA !== weightB) {
                return weightB - weightA; // Higher weight first
            }
            return a.createdAt - b.createdAt; // Earliest timestamp first (FIFO)
        });
    }
    /**
     * Get all waiting tickets, optionally filtered by service code.
     */
    static getWaitingTickets(serviceCode) {
        const allTickets = storage.getTickets();
        const waiting = allTickets.filter((t) => {
            const isWaiting = t.status === 'MENUNGGU';
            return serviceCode ? isWaiting && t.serviceCode === serviceCode : isWaiting;
        });
        return this.sortWaitingTickets(waiting);
    }
    /**
     * Get currently called ticket for a specific service.
     */
    static getCalledTicket(serviceCode) {
        const allTickets = storage.getTickets();
        const called = allTickets.find((t) => t.serviceCode === serviceCode && t.status === 'DIPANGGIL');
        return called || null;
    }
    /**
     * Peek next ticket in line for a service based on priority.
     */
    static getNextTicket(serviceCode) {
        const waiting = this.getWaitingTickets(serviceCode);
        return waiting.length > 0 ? waiting[0] : null;
    }
    /**
     * "Panggil Berikutnya":
     * 1. Marks current active called ticket as SELESAI.
     * 2. Fetches next waiting ticket by priority.
     * 3. Marks next ticket as DIPANGGIL.
     */
    static callNext(serviceCode) {
        const currentCalled = this.getCalledTicket(serviceCode);
        if (currentCalled) {
            storage.updateTicketStatus(currentCalled.id, 'SELESAI');
        }
        const nextTicket = this.getNextTicket(serviceCode);
        if (nextTicket) {
            return storage.updateTicketStatus(nextTicket.id, 'DIPANGGIL');
        }
        return null;
    }
    /**
     * "Lewati":
     * Moves the currently called ticket (or next ticket if none called)
     * to the end of the queue or marks as DILEWATI.
     */
    static skipCurrent(serviceCode) {
        const currentCalled = this.getCalledTicket(serviceCode);
        if (!currentCalled)
            return null;
        // Requirement: "Memindahkan tiket yang tidak hadir ke akhir antrian atau menandainya sebagai Dilewati"
        // We mark it as DILEWATI and update its timestamp to end of queue so it can be recalled later if needed
        currentCalled.status = 'DILEWATI';
        currentCalled.createdAt = Date.now(); // move to back
        const tickets = storage.getTickets();
        const idx = tickets.findIndex((t) => t.id === currentCalled.id);
        if (idx !== -1) {
            tickets[idx] = currentCalled;
            storage.saveTickets(tickets);
            storage.publishEvent('TICKET_SKIPPED', currentCalled);
        }
        return currentCalled;
    }
    /**
     * "Selesai":
     * Closes the currently called ticket without automatically calling the next one.
     */
    static completeCurrent(serviceCode) {
        const currentCalled = this.getCalledTicket(serviceCode);
        if (currentCalled) {
            return storage.updateTicketStatus(currentCalled.id, 'SELESAI');
        }
        return null;
    }
    static recallCurrent(serviceCode) {
        const currentCalled = this.getCalledTicket(serviceCode);
        if (currentCalled) {
            return storage.recallTicket(currentCalled.id);
        }
        return null;
    }
}
