import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  History,
  RotateCcw,
  Sparkles,
  Radio,
  Sliders,
} from 'lucide-react';
import { DisplayDevice, DailySequenceState, QueueAnalytics } from '../types';
import { soundManager } from '../utils/sound';

interface HostNavbarProps {
  device: DisplayDevice;
  sequence: DailySequenceState;
  analytics: QueueAnalytics;
  onOpenHardwareModal: () => void;
  onOpenHistoryModal: () => void;
  onOpenRolloverModal: () => void;
  onResetDemoData: () => void;
  onToggleDeviceStatus: () => void;
}

export const HostNavbar: React.FC<HostNavbarProps> = ({
  device,
  sequence,
  analytics,
  onOpenHardwareModal,
  onOpenHistoryModal,
  onOpenRolloverModal,
  onResetDemoData,
  onToggleDeviceStatus,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [heartbeatAgo, setHeartbeatAgo] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (device.last_heartbeat) {
        const diffSec = Math.max(0, Math.floor((Date.now() - new Date(device.last_heartbeat).getTime()) / 1000));
        setHeartbeatAgo(diffSec);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [device.last_heartbeat]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.enabled = next;
    if (next) soundManager.playSeatedChime();
  };

  const isOnline = device.status === 'ONLINE';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Station */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Host Stand Waitlist
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/80 rounded-full">
                  LAN Mode
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Business Day: <span className="text-slate-300 font-mono-code">{sequence.business_date}</span> • Token Sequence: <span className="font-semibold text-amber-400">#{sequence.current_token}</span>
              </p>
            </div>
          </div>

          {/* Center / Edge Case Indicator: Hardware LED Connection */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenHardwareModal}
              title="Click to view LED Controller Hardware & Diagnostic details"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isOnline
                  ? 'bg-slate-800/90 text-slate-200 border-slate-700 hover:border-emerald-500/50'
                  : 'bg-rose-950/80 text-rose-200 border-rose-600/80 animate-pulse'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {isOnline ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono-code text-[11px]">LED {device.ip_address}</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                    <span className="font-bold text-rose-300">LED BOARD OFFLINE</span>
                  </>
                )}
              </div>
              <span className="text-slate-400 text-[10px] hidden md:inline">
                ({isOnline ? `ping ${heartbeatAgo}s` : 'unreachable'})
              </span>
              <Sliders className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {/* Quick Toggle for testing WiFi drop resilience */}
            <button
              onClick={onToggleDeviceStatus}
              title={isOnline ? "Simulate Wi-Fi drop / disconnect" : "Restore Wi-Fi connection"}
              className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 hover:bg-slate-700/80 transition"
            >
              {isOnline ? "Simulate Drop" : "Simulate Online"}
            </button>
          </div>

          {/* Quick Action Utilities */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Audio chime toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg border text-sm transition cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-800/40 border-slate-800 text-slate-500'
              }`}
              title={soundEnabled ? 'Chimes enabled' : 'Chimes muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Daily Rollover button */}
            <button
              onClick={onOpenRolloverModal}
              className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="Daily sequence reset (04:00 AM cron simulation)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden lg:inline">Daily Rollover</span>
            </button>

            {/* Seated & History Archive */}
            <button
              onClick={onOpenHistoryModal}
              className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="View Seated & Cancelled History"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>History ({analytics.totalSeated})</span>
            </button>

            {/* Reset mock data */}
            <button
              onClick={onResetDemoData}
              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition text-xs flex items-center"
              title="Reset initial demo data"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
