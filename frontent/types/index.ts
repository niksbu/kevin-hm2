/**
 * Data Models and Types for Restaurant Waitlist Manager
 * Based on _docs/specs.md (Document Version 1.0.0)
 */

export type WaitlistStatus = 'WAITING' | 'CALLED' | 'SEATED' | 'CANCELLED';

export interface WaitlistEntry {
  id: string;
  token_number: number;
  party_name: string;
  party_size: number;
  status: WaitlistStatus;
  notes?: string | null;
  created_at: string; // ISO timestamp
  called_at?: string | null;
  seated_at?: string | null;
  completed_at?: string | null;
}

export interface CreateWaitlistEntryInput {
  party_name: string;
  party_size: number;
  notes?: string;
}

export type DeviceHealthStatus = 'ONLINE' | 'OFFLINE' | 'ERROR';

export interface DisplayDevice {
  device_id: string;
  ip_address: string;
  status: DeviceHealthStatus;
  last_heartbeat: string; // ISO timestamp
  model: string;
  resolution: string;
  protocol: 'HTTP' | 'MQTT' | 'UDP';
}

export interface CallingPartyPayload {
  mode: 'CALL';
  token: number;
  party_name: string;
  party_size: number;
  display_text: string;
  flash: boolean;
  timeout_seconds: number;
  dispatched_at: string;
}

export interface IdleQueuePayload {
  mode: 'IDLE';
  queue_depth: number;
  display_text: string;
  flash: boolean;
  timeout_seconds: number;
  dispatched_at: string;
}

export type HardwarePayload = CallingPartyPayload | IdleQueuePayload;

export interface DailySequenceState {
  business_date: string;
  current_token: number;
  total_served_today: number;
  last_rollover_at: string;
}

export interface QueueAnalytics {
  totalWaiting: number;
  totalSeated: number;
  totalCancelled: number;
  avgWaitMinutes: number;
  activePartyCount: number;
}
