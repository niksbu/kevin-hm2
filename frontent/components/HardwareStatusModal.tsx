import React, { useState } from 'react';
import {
  X,
  Cpu,
  Wifi,
  WifiOff,
  Activity,
  CheckCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { DisplayDevice, HardwarePayload } from '../types';

interface HardwareStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: DisplayDevice;
  payload: HardwarePayload | null;
  onSetStatus: (status: 'ONLINE' | 'OFFLINE' | 'ERROR') => Promise<void>;
  onSendTestDispatch: () => Promise<void>;
}

export const HardwareStatusModal: React.FC<HardwareStatusModalProps> = ({
  isOpen,
  onClose,
  device,
  payload,
  onSetStatus,
  onSendTestDispatch,
}) => {
  const [isPinging, setIsPinging] = useState(false);
  const [pingMessage, setPingMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePing = async () => {
    setIsPinging(true);
    setPingMessage(null);
    await new Promise((r) => setTimeout(r, 300));
    if (device.status === 'ONLINE') {
      setPingMessage(`Echo from ${device.ip_address}: time=1.42ms (Zero Cloud Latency)`);
    } else {
      setPingMessage(`Host unreachable: connect to ${device.ip_address} failed.`);
    }
    setIsPinging(false);
  };

  const isOnline = device.status === 'ONLINE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">LED Controller Diagnostics</h2>
              <p className="text-xs text-slate-400">On-premise HUB75 Driver & Network Peripheral</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Hardware Specs Table per Section 4 */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 bg-slate-900/60 border-b border-slate-800 font-semibold text-slate-300 flex items-center justify-between">
              <span>Display Hardware Registration (display_devices)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isOnline
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {device.status}
              </span>
            </div>
            <div className="p-3 space-y-2 font-mono-code">
              <div className="flex justify-between">
                <span className="text-slate-400">device_id (MAC):</span>
                <span className="text-white font-semibold">{device.device_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ip_address (LAN):</span>
                <span className="text-amber-400 font-semibold">{device.ip_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">panel_hardware:</span>
                <span className="text-slate-300">{device.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">pixel_resolution:</span>
                <span className="text-slate-300">{device.resolution}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">last_heartbeat:</span>
                <span className="text-slate-300">{new Date(device.last_heartbeat).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* Diagnostics Actions */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
              Connection Simulation & Resilience Tests (Section 6)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSetStatus(isOnline ? 'OFFLINE' : 'ONLINE')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition font-semibold cursor-pointer ${
                  isOnline
                    ? 'bg-rose-950/40 border-rose-800/80 text-rose-300 hover:bg-rose-900/60'
                    : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60'
                }`}
              >
                {isOnline ? <WifiOff className="w-4 h-4 text-rose-400" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
                <span>{isOnline ? 'Simulate Wi-Fi Drop (Offline)' : 'Restore Connection (Online)'}</span>
              </button>

              <button
                onClick={handlePing}
                disabled={isPinging}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex flex-col items-center justify-center gap-1.5 transition font-semibold cursor-pointer disabled:opacity-50"
              >
                <Activity className={`w-4 h-4 text-sky-400 ${isPinging ? 'animate-spin' : ''}`} />
                <span>{isPinging ? 'Pinging Subnet...' : 'Ping Microcontroller'}</span>
              </button>
            </div>

            {pingMessage && (
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono-code text-[11px] text-slate-300">
                {pingMessage}
              </div>
            )}
          </div>

          {/* Peripheral Protocol Spec */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Architecture Spec Compliance:</p>
            <p>• Zero Cloud Latency: operates strictly over subnet 192.168.1.0/24</p>
            <p>• Heartbeat: polled / pulsed every 10 seconds</p>
            <p>• Marquee Auto-Scroll: active for strings &gt;8 characters</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
