/**
 * Centralized Backend API Client (Mock Implementation)
 * Per spec requirement: "Don't implement the backend yet. Centralize all the backend calls in one place and mock them for now."
 * 
 * Spec endpoints implemented:
 * - POST /api/queue -> addEntry()
 * - POST /api/queue/{id}/call -> callParty()
 * - PATCH /api/queue/{id}/status -> updateStatus()
 * - Hardware dispatch & heartbeat management
 * - Daily token rollover management
 */

import {
  WaitlistEntry,
  CreateWaitlistEntryInput,
  WaitlistStatus,
  DeviceHealthStatus,
  DisplayDevice,
  HardwarePayload,
  CallingPartyPayload,
  IdleQueuePayload,
  DailySequenceState,
  QueueAnalytics,
} from '../types';

const STORAGE_KEYS = {
  ENTRIES: 'restaurant_waitlist_entries_v1',
  SEQUENCE: 'restaurant_waitlist_sequence_v1',
  DEVICE: 'restaurant_display_device_v1',
  ACTIVE_PAYLOAD: 'restaurant_led_payload_v1',
};

// Initial mock data simulating an active Friday evening dinner service
const getInitialEntries = (): WaitlistEntry[] => {
  const now = Date.now();
  return [
    {
      id: 'e7b0b7e2-4f81-4b77-8c3b-7a3a30c50d12',
      token_number: 12,
      party_name: 'Johnson',
      party_size: 2,
      status: 'WAITING',
      notes: 'Prefers booth inside',
      created_at: new Date(now - 19 * 60 * 1000).toISOString(),
    },
    {
      id: 'e7b0b7e2-4f81-4b77-8c3b-7a3a30c50d13',
      token_number: 13,
      party_name: 'Rodriguez',
      party_size: 6,
      status: 'WAITING',
      notes: 'Patio seating, 1 high chair needed',
      created_at: new Date(now - 14 * 60 * 1000).toISOString(),
    },
    {
      id: 'e7b0b7e2-4f81-4b77-8c3b-7a3a30c50d14',
      token_number: 14,
      party_name: 'Smith',
      party_size: 4,
      status: 'CALLED',
      notes: 'Patio if possible',
      created_at: new Date(now - 22 * 60 * 1000).toISOString(),
      called_at: new Date(now - 25 * 1000).toISOString(), // 25s into 60s timer
    },
    {
      id: 'e7b0b7e2-4f81-4b77-8c3b-7a3a30c50d15',
      token_number: 15,
      party_name: 'Vanderbilt-Montgomery', // Long name to demonstrate > 8 chars marquee scrolling
      party_size: 3,
      status: 'WAITING',
      notes: 'Anniversary celebration • quiet area',
      created_at: new Date(now - 8 * 60 * 1000).toISOString(),
    },
    {
      id: 'e7b0b7e2-4f81-4b77-8c3b-7a3a30c50d16',
      token_number: 16,
      party_name: 'Chen',
      party_size: 2,
      status: 'WAITING',
      notes: 'Bar-height table is fine',
      created_at: new Date(now - 3 * 60 * 1000).toISOString(),
    },
    // Completed archives
    {
      id: 'e7b0b7e2-4f81-4b77-8c3b-7a3a30c50d10',
      token_number: 10,
      party_name: 'Taylor',
      party_size: 4,
      status: 'SEATED',
      notes: null,
      created_at: new Date(now - 55 * 60 * 1000).toISOString(),
      called_at: new Date(now - 36 * 60 * 1000).toISOString(),
      seated_at: new Date(now - 35 * 60 * 1000).toISOString(),
      completed_at: new Date(now - 35 * 60 * 1000).toISOString(),
    },
    {
      id: 'e7b0b7e2-4f81-4b77-8c3b-7a3a30c50d11',
      token_number: 11,
      party_name: 'Kim',
      party_size: 2,
      status: 'SEATED',
      notes: 'Wheelchair access provided',
      created_at: new Date(now - 45 * 60 * 1000).toISOString(),
      called_at: new Date(now - 20 * 60 * 1000).toISOString(),
      seated_at: new Date(now - 18 * 60 * 1000).toISOString(),
      completed_at: new Date(now - 18 * 60 * 1000).toISOString(),
    },
    {
      id: 'e7b0b7e2-4f81-4b77-8c3b-7a3a30c50d09',
      token_number: 9,
      party_name: 'Davies',
      party_size: 5,
      status: 'CANCELLED',
      notes: 'No show after 3 announcements',
      created_at: new Date(now - 70 * 60 * 1000).toISOString(),
      called_at: new Date(now - 40 * 60 * 1000).toISOString(),
      completed_at: new Date(now - 38 * 60 * 1000).toISOString(),
    },
  ];
};

const getInitialDevice = (): DisplayDevice => ({
  device_id: 'ESP32-HUB75-8C:3B:7A:3A',
  ip_address: '192.168.1.142',
  status: 'ONLINE',
  last_heartbeat: new Date().toISOString(),
  model: 'HUB75 RGB LED Matrix (64x32 Dual Panel)',
  resolution: '128x32 px',
  protocol: 'HTTP',
});

// In-memory state with localStorage synchronization
class MockWaitlistBackend {
  private entries: WaitlistEntry[] = [];
  private sequence: DailySequenceState = {
    business_date: new Date().toISOString().split('T')[0],
    current_token: 16,
    total_served_today: 16,
    last_rollover_at: new Date().toISOString(),
  };
  private device: DisplayDevice = getInitialDevice();
  private currentPayload: HardwarePayload | null = null;
  private listeners: Set<() => void> = new Set();
  private heartbeatInterval: any = null;

  constructor() {
    this.loadState();
    this.refreshHardwarePayload();
    this.startHeartbeatMonitor();
  }

  private loadState() {
    try {
      const savedEntries = localStorage.getItem(STORAGE_KEYS.ENTRIES);
      if (savedEntries) {
        this.entries = JSON.parse(savedEntries);
      } else {
        this.entries = getInitialEntries();
        this.persist();
      }

      const savedSeq = localStorage.getItem(STORAGE_KEYS.SEQUENCE);
      if (savedSeq) {
        this.sequence = JSON.parse(savedSeq);
      }

      const savedDev = localStorage.getItem(STORAGE_KEYS.DEVICE);
      if (savedDev) {
        this.device = JSON.parse(savedDev);
      }
    } catch {
      this.entries = getInitialEntries();
      this.device = getInitialDevice();
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(this.entries));
      localStorage.setItem(STORAGE_KEYS.SEQUENCE, JSON.stringify(this.sequence));
      localStorage.setItem(STORAGE_KEYS.DEVICE, JSON.stringify(this.device));
      if (this.currentPayload) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PAYLOAD, JSON.stringify(this.currentPayload));
      }
    } catch {
      // Local storage failed or unavailable in sandboxed environment
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private startHeartbeatMonitor() {
    // 10-second heartbeat ping verification per spec
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.device.status === 'ONLINE') {
        this.device.last_heartbeat = new Date().toISOString();
        this.persist();
      }
    }, 10000);
  }

  /**
   * Recalculates the Hardware Communication Payload (Server to LED Controller)
   * Dispatched via local HTTP POST (http://<controller-ip>/display), MQTT, or UDP.
   */
  private refreshHardwarePayload() {
    const calledParty = this.entries.find((e) => e.status === 'CALLED');
    const waitingParties = this.entries.filter((e) => e.status === 'WAITING');

    if (calledParty) {
      const payload: CallingPartyPayload = {
        mode: 'CALL',
        token: calledParty.token_number,
        party_name: calledParty.party_name.toUpperCase(),
        party_size: calledParty.party_size,
        display_text: `NOW CALLING: #${calledParty.token_number} (${calledParty.party_size})`,
        flash: true,
        timeout_seconds: 60,
        dispatched_at: new Date().toISOString(),
      };
      this.currentPayload = payload;
    } else {
      const payload: IdleQueuePayload = {
        mode: 'IDLE',
        queue_depth: waitingParties.length,
        display_text: `WAITLIST: ${waitingParties.length} PARTIES`,
        flash: false,
        timeout_seconds: 0,
        dispatched_at: new Date().toISOString(),
      };
      this.currentPayload = payload;
    }
  }

  // ==========================================
  // SPEC ENDPOINTS
  // ==========================================

  /**
   * 1. Add Entry to Queue
   * Method: POST /api/queue
   */
  public async addEntry(input: CreateWaitlistEntryInput): Promise<WaitlistEntry> {
    // Artificial latency for realism (sub-100ms for local LAN)
    await new Promise((r) => setTimeout(r, 60));

    if (!input.party_name.trim()) {
      throw new Error('Party surname or identifier is required');
    }

    this.sequence.current_token += 1;
    this.sequence.total_served_today += 1;

    const newEntry: WaitlistEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : `party-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      token_number: this.sequence.current_token,
      party_name: input.party_name.trim().slice(0, 50),
      party_size: Math.max(1, Math.min(input.party_size, 30)),
      status: 'WAITING',
      notes: input.notes?.trim() ? input.notes.trim().slice(0, 120) : null,
      created_at: new Date().toISOString(),
    };

    // FIFO queue: append to the active list
    this.entries.push(newEntry);
    this.refreshHardwarePayload();
    this.persist();

    return { ...newEntry };
  }

  /**
   * 2. Call Party
   * Method: POST /api/queue/{id}/call
   */
  public async callParty(id: string): Promise<WaitlistEntry> {
    await new Promise((r) => setTimeout(r, 50));

    const target = this.entries.find((e) => e.id === id);
    if (!target) {
      throw new Error('Waitlist entry not found');
    }

    if (target.status === 'SEATED' || target.status === 'CANCELLED') {
      throw new Error(`Cannot call party that is already ${target.status}`);
    }

    // Spec finite state machine:
    // Starts countdown/recall timer (60s), marks entry as active (CALLED)
    target.status = 'CALLED';
    target.called_at = new Date().toISOString();

    // Hardware payload dispatches calling notice
    this.refreshHardwarePayload();
    this.persist();

    return { ...target };
  }

  /**
   * 3. Update Status (Seat / Cancel)
   * Method: PATCH /api/queue/{id}/status
   */
  public async updateStatus(id: string, status: 'SEATED' | 'CANCELLED'): Promise<WaitlistEntry> {
    await new Promise((r) => setTimeout(r, 50));

    const target = this.entries.find((e) => e.id === id);
    if (!target) {
      throw new Error('Waitlist entry not found');
    }

    const nowIso = new Date().toISOString();
    target.status = status;
    target.completed_at = nowIso;

    if (status === 'SEATED') {
      target.seated_at = nowIso;
    }

    // Display reverts to queue depth or next party
    this.refreshHardwarePayload();
    this.persist();

    return { ...target };
  }

  // ==========================================
  // QUERY & CONTROLLER HELPER METHODS
  // ==========================================

  public async getQueue(): Promise<WaitlistEntry[]> {
    return [...this.entries];
  }

  public async getDevice(): Promise<DisplayDevice> {
    return { ...this.device };
  }

  public async getHardwarePayload(): Promise<HardwarePayload | null> {
    return this.currentPayload ? { ...this.currentPayload } : null;
  }

  public async getDailySequence(): Promise<DailySequenceState> {
    return { ...this.sequence };
  }

  /**
   * Toggle or set device status (Used to simulate Wi-Fi drop per Section 6)
   */
  public async setDeviceStatus(status: DeviceHealthStatus): Promise<DisplayDevice> {
    this.device.status = status;
    if (status === 'ONLINE') {
      this.device.last_heartbeat = new Date().toISOString();
    }
    this.persist();
    return { ...this.device };
  }

  /**
   * Section 6: Wi-Fi / Controller Drop mitigation:
   * "UI displays an on-screen visual badge warning the host. A manual 'Retry LED' button appears next to the party."
   */
  public async retryLedDispatch(partyId: string): Promise<{ success: boolean; message: string }> {
    await new Promise((r) => setTimeout(r, 200));

    if (this.device.status !== 'ONLINE') {
      return {
        success: false,
        message: `Failed: LED Controller at ${this.device.ip_address} is unreachable (${this.device.status}). Check local LAN.`,
      };
    }

    const party = this.entries.find((e) => e.id === partyId);
    if (party) {
      this.refreshHardwarePayload();
      this.persist();
      return {
        success: true,
        message: `Dispatched command to ${this.device.ip_address} via HTTP POST: NOW CALLING #${party.token_number}`,
      };
    }

    return { success: false, message: 'Party not found.' };
  }

  /**
   * Section 6 & 7: Daily Rollover
   * Automated daily cron task resets token_number sequence to 1 during restaurant closing hours (04:00 AM).
   */
  public async performDailyRollover(): Promise<DailySequenceState> {
    await new Promise((r) => setTimeout(r, 100));

    const today = new Date().toISOString().split('T')[0];
    this.sequence = {
      business_date: today,
      current_token: 0,
      total_served_today: 0,
      last_rollover_at: new Date().toISOString(),
    };

    // Archive any lingering open parties from previous service day
    this.entries = this.entries.map((e) => {
      if (e.status === 'WAITING' || e.status === 'CALLED') {
        return {
          ...e,
          status: 'CANCELLED',
          completed_at: new Date().toISOString(),
          notes: e.notes ? `${e.notes} [Rollover auto-closed]` : '[Rollover auto-closed]',
        };
      }
      return e;
    });

    this.refreshHardwarePayload();
    this.persist();
    return { ...this.sequence };
  }

  /**
   * Restore default demo entries for testing
   */
  public async resetDemoData(): Promise<void> {
    this.entries = getInitialEntries();
    this.device = getInitialDevice();
    this.sequence = {
      business_date: new Date().toISOString().split('T')[0],
      current_token: 16,
      total_served_today: 16,
      last_rollover_at: new Date().toISOString(),
    };
    this.refreshHardwarePayload();
    this.persist();
  }

  /**
   * Analytics calculation for host reporting
   */
  public getAnalytics(): QueueAnalytics {
    const waiting = this.entries.filter((e) => e.status === 'WAITING');
    const called = this.entries.filter((e) => e.status === 'CALLED');
    const seated = this.entries.filter((e) => e.status === 'SEATED');
    const cancelled = this.entries.filter((e) => e.status === 'CANCELLED');

    // Calculate average wait time for seated guests
    let totalWaitMs = 0;
    let countedGuests = 0;

    seated.forEach((e) => {
      if (e.seated_at && e.created_at) {
        const wait = new Date(e.seated_at).getTime() - new Date(e.created_at).getTime();
        if (wait > 0) {
          totalWaitMs += wait;
          countedGuests += 1;
        }
      }
    });

    const avgMinutes = countedGuests > 0 ? Math.round(totalWaitMs / countedGuests / 60000) : 18;

    return {
      totalWaiting: waiting.length,
      totalSeated: seated.length,
      totalCancelled: cancelled.length,
      avgWaitMinutes: avgMinutes,
      activePartyCount: waiting.length + called.length,
    };
  }
}

// Singleton API Client instance
export const backendApi = new MockWaitlistBackend();
