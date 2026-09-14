# Restaurant Waitlist Manager — Software & Hardware Specification

Document Version: 1.0.0
Status: Approved for Implementation
Architecture Pattern: Local-First Web Application + Microcontroller Peripheral Driver

## 1. Executive Summary & System Objectives
The Restaurant Waitlist Manager is a lightweight, on-premise application engineered for restaurant front-of-house staff. It streamlines walk-in queue management and dispatches real-time visual notifications to an on-premise LED display board over the local network (LAN).

### Core Goals
- **Zero Cloud Latency**: Operates entirely over local network infrastructure to eliminate dependence on external internet connectivity.
- **Fast Host Ergonomics**: Minimal clicks and large touch targets optimized for high-traffic host stands on tablets or POS browsers.
- **Immediate Visual Feedback**: Instantaneous updates to waiting patrons via an LED display board driven by a dedicated microcontroller.

---

## 2. System Architecture

```
+-------------------------------------------------------------+
| Local Network (LAN)                                         |
|                                                             |
| +-------------------+  HTTP/WS  +------------------+        |
| | Host Interface    | <-------> | Local Server     |        |
| | (Tablet / Browser)|           | (Python / Node)  |        |
| +-------------------+           +--------+---------+        |
|                                          |                  |
|                               HTTP /     | MQTT / UDP       |
|                               v          |                  |
|                         +------------------+                |
|                         | Display Driver   |                |
|                         | (ESP32 / Pi)     |                |
|                         +--------+---------+                |
|                                  | HUB75 /                  |
|                                  | RS485                    |
|                                  v                          |
|                         +------------------+                |
|                         | LED Matrix Board |                |
|                         +------------------+                |
+-------------------------------------------------------------+
```

### Component Breakdown
1. **Client Tier**: Responsive web interface running in the host stand browser (tablet or touchscreen POS).
2. **Server Tier**: Lightweight local application service (e.g., Python FastAPI, Django, or Node.js) maintaining SQLite/PostgreSQL persistence and managing real-time connections.
3. **Controller Tier**: Wi-Fi/Ethernet microcontroller (e.g., ESP32 or Raspberry Pi) listening to broadcast events or polling the local server.
4. **Output Tier**: Single- or multi-panel HUB75 RGB LED matrix (e.g., 64x32 or 128x32) or an RS485 industrial character display.

---

## 3. Queue Lifecycle & Finite State Machine

Each waitlist entry transitions through a deterministic series of operational states:

```
[ Intake ]
    │
    ▼
 WAITING ───────────────► CANCELLED / NO-SHOW
    │                           ▲
    │ (Host calls table)        │
    ▼                           │
  CALLED ───────────────────────┘
    │
    │ (Host confirms seating)
    ▼
  SEATED
```

### State Definitions
| State | Trigger | System Behavior | LED Display State |
|---|---|---|---|
| **WAITING** | Host logs party details. | Generates sequential daily token; appends party to FIFO queue. | Shows queue summary (e.g., `Waiting: 6`). |
| **CALLED** | Host triggers "Call Party". | Starts countdown/recall timer; marks entry as active. | Flashes calling notice: `NOW SERVING #12 (PARTY OF 4)`. |
| **SEATED** | Host marks party as seated. | Records timestamps and queue duration; archives entry. | Reverts display to queue count or idle screen. |
| **CANCELLED** | Host marks party as absent/left. | Closes entry; logs status for operational analytics. | Display cleared immediately. |

---

## 4. Data Specifications & Models

### Waitlist Entry Schema (`waitlist_entries`)
| Column Name | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / INT | PK, Auto-increment | Unique identifier for database integrity. |
| `token_number` | INTEGER | NOT NULL | Sequential token number issued per business day. |
| `party_name` | VARCHAR(50) | NOT NULL | Guest surname or display identifier. |
| `party_size` | SMALLINT | NOT NULL, DEFAULT 1 | Number of guests in the party. |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'WAITING' | Enum: WAITING, CALLED, SEATED, CANCELLED. |
| `notes` | VARCHAR(120) | NULLABLE | High-chair, patio preference, or accessibility notes. |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Time party entered the queue. |
| `called_at` | TIMESTAMP | NULLABLE | Timestamp when party was dispatched to the display. |
| `seated_at` | TIMESTAMP | NULLABLE | Timestamp when guest was seated. |
| `completed_at` | TIMESTAMP | NULLABLE | Timestamp when entry was closed (SEATED or CANCELLED). |

### Display Hardware Registration Schema (`display_devices`)
| Column Name | Type | Constraints | Description |
|---|---|---|---|
| `device_id` | VARCHAR(64) | PK | Hardware MAC address or unique identifier. |
| `ip_address` | INET / VARCHAR(45) | NOT NULL | Static or reserved local network IP address. |
| `status` | VARCHAR(20) | DEFAULT 'ONLINE' | Health status: ONLINE, OFFLINE, ERROR. |
| `last_heartbeat` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Periodic ping timestamp for connection health. |

---

## 5. Interface & API Specifications

### Host UI Endpoints

#### 1. Add Entry to Queue
- **Method**: `POST /api/queue`
- **Request Body**:
```json
{
  "party_name": "Smith",
  "party_size": 4,
  "notes": "Patio if possible"
}
```
- **Response (201 Created)**:
```json
{
  "id": "e7b0b7e2-4f81-4b77-8c3b-7a3a30c50d81",
  "token_number": 14,
  "party_name": "Smith",
  "party_size": 4,
  "status": "WAITING",
  "created_at": "2025-05-18T18:42:10Z"
}
```

#### 2. Call Party
- **Method**: `POST /api/queue/{id}/call`
- **Response (200 OK)**:
```json
{
  "id": "e7b0b7e2-4f81-4b77-8c3b-7a3a30c50d81",
  "token_number": 14,
  "status": "CALLED",
  "called_at": "2025-05-18T19:02:44Z"
}
```

#### 3. Update Status (Seat / Cancel)
- **Method**: `PATCH /api/queue/{id}/status`
- **Request Body**:
```json
{
  "status": "SEATED"
}
```
- **Response (200 OK)**:
```json
{
  "id": "e7b0b7e2-4f81-4b77-8c3b-7a3a30c50d81",
  "status": "SEATED",
  "completed_at": "2025-05-18T19:05:12Z"
}
```

### Hardware Communication Payload (Server to LED Controller)
Dispatched via local HTTP POST (`http://<controller-ip>/display`), local MQTT broker, or raw UDP socket.

#### Payload Structure: Calling Party
```json
{
  "mode": "CALL",
  "token": 14,
  "party_name": "SMITH",
  "party_size": 4,
  "display_text": "NOW CALLING: #14 (4)",
  "flash": true,
  "timeout_seconds": 60
}
```

#### Payload Structure: Idle / Queue Depth
```json
{
  "mode": "IDLE",
  "queue_depth": 5,
  "display_text": "WAITLIST: 5 PARTIES",
  "flash": false,
  "timeout_seconds": 0
}
```

---

## 6. Edge Cases & Resilience Strategy

| Failure Scenario | Risk | Mitigation Protocol |
|---|---|---|
| **Wi-Fi / Controller Drop** | LED board fails to update when host clicks "Call". | Server checks microcontroller heartbeat every 10 seconds. If offline, UI displays an on-screen visual badge warning the host. A manual "Retry LED" button appears next to the party. |
| **Long Guest Names** | Names exceed LED matrix pixel dimensions. | Display controller checks character count. If string length exceeds display buffer (e.g. > 8 characters on a 64-pixel wide board), it automatically activates smooth horizontal marquee scrolling. |
| **Concurrent Host Usage** | Multiple tablets call or seat the same entry simultaneously. | Database transactions enforce optimistic concurrency checks (version / state verification) before applying transitions. |
| **Daily Rollover** | Token numbers become excessively large over time. | Automated daily cron task resets `token_number` sequence to 1 during restaurant closing hours (configurable, e.g., 04:00 AM). |

---

## 7. Implementation Roadmap
- **Phase 1**: Backend & Queue Engine
- **Phase 2**: Touch-Optimized Host Frontend
- **Phase 3**: Hardware Firmware & Driver
- **Phase 4**: End-to-End Testing & On-Premise Hardening
