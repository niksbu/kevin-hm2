import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Code,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { HardwarePayload, DisplayDevice } from '../types';

interface LedMatrixSimulatorProps {
  payload: HardwarePayload | null;
  device: DisplayDevice;
  onRetryLed?: () => void;
  isRetrying?: boolean;
}

export const LedMatrixSimulator: React.FC<LedMatrixSimulatorProps> = ({
  payload,
  device,
  onRetryLed,
  isRetrying = false,
}) => {
  const [showPayloadJson, setShowPayloadJson] = useState(false);
  const [flashState, setFlashState] = useState(true);

  const isOnline = device.status === 'ONLINE';
  const isCalling = payload?.mode === 'CALL';

  // Flashing animation for CALL mode (toggles every 500ms when flash is true)
  useEffect(() => {
    if (isCalling && payload?.flash) {
      const interval = setInterval(() => {
        setFlashState((prev) => !prev);
      }, 600);
      return () => clearInterval(interval);
    } else {
      setFlashState(true);
    }
  }, [isCalling, payload?.flash]);

  // Determine display text & check if marquee scrolling is needed
  // Spec: If string length exceeds display buffer (> 8 characters on 64-pixel board),
  // automatically activates smooth horizontal marquee scrolling.
  let mainText = '';
  let subText = '';
  let requiresMarquee = false;

  if (isCalling && payload) {
    mainText = payload.display_text || `NOW CALLING: #${payload.token}`;
    // If party name is available, display or marquee it
    subText = `${payload.party_name} • PARTY OF ${payload.party_size}`;
    if (payload.party_name.length > 8 || mainText.length > 18) {
      requiresMarquee = true;
    }
  } else if (payload && payload.mode === 'IDLE') {
    mainText = payload.display_text || `WAITLIST: ${payload.queue_depth} PARTIES`;
    subText = payload.queue_depth === 0 ? 'NO WAIT • SEATING NOW' : 'PLEASE WAIT FOR YOUR NUMBER';
    if (mainText.length > 18) {
      requiresMarquee = true;
    }
  } else {
    mainText = 'WAITLIST READY';
    subText = 'ESP32 STANDBY';
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
      {/* Header bar of the peripheral driver */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                On-Premise LED Display Board
              </span>
              <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                HUB75 RGB (128x32)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Microcontroller: <span className="font-mono-code text-slate-300">{device.device_id}</span> ({device.ip_address})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Edge Case Warning if offline */}
          {!isOnline && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950/80 border border-rose-600 text-rose-300 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
              <span>CONTROLLER DISCONNECTED</span>
            </div>
          )}

          {/* Toggle Payload Inspector */}
          <button
            onClick={() => setShowPayloadJson(!showPayloadJson)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition"
            title="Inspect raw hardware JSON dispatched to ESP32"
          >
            <Code className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Hardware Payload</span>
          </button>
        </div>
      </div>

      {/* Physical LED Display Board Bezel Representation */}
      <div className="relative rounded-xl bg-black p-3 sm:p-4 border-2 border-slate-800 shadow-2xl shadow-black/80">
        {/* Corner hardware hex screws */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-slate-700 border border-slate-600"></div>
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-slate-700 border border-slate-600"></div>
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-slate-700 border border-slate-600"></div>
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-slate-700 border border-slate-600"></div>

        {/* LED Matrix Screen Glass */}
        <div className="led-screen-grid rounded-lg border border-neutral-900 px-4 py-5 min-h-[110px] flex flex-col items-center justify-center text-center overflow-hidden relative">
          {!isOnline ? (
            <div className="py-3 text-center">
              <p className="font-led text-2xl text-rose-500/80 tracking-widest animate-pulse">
                [ NO CONNECTION TO DRIVER ]
              </p>
              <p className="text-xs font-mono-code text-slate-500 mt-1">
                Awaiting UDP/HTTP broadcast from {device.ip_address}...
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center">
              {/* Primary Notification Line */}
              <div
                className={`w-full overflow-hidden whitespace-nowrap transition-opacity duration-200 ${
                  isCalling && !flashState ? 'opacity-20' : 'opacity-100'
                }`}
              >
                <div
                  className={`font-led text-3xl sm:text-4xl md:text-5xl tracking-widest uppercase inline-block ${
                    isCalling ? 'led-red-glow font-bold' : 'led-amber-glow'
                  } ${requiresMarquee ? 'animate-marquee' : ''}`}
                >
                  {mainText}
                </div>
              </div>

              {/* Secondary Subtitle / Guest Name / Marquee Line */}
              <div className="w-full overflow-hidden whitespace-nowrap mt-1">
                <div
                  className={`font-led text-xl sm:text-2xl tracking-wider uppercase inline-block ${
                    isCalling ? 'led-amber-glow font-semibold' : 'text-amber-500/70'
                  } ${requiresMarquee ? 'animate-marquee' : ''}`}
                >
                  {subText}
                </div>
              </div>

              {/* Mode & Status LED Pips */}
              <div className="w-full flex items-center justify-between mt-2 pt-2 border-t border-amber-500/10 text-[10px] font-mono-code text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      isCalling ? 'bg-red-500 animate-ping' : 'bg-amber-400'
                    }`}
                  ></span>
                  MODE: {payload?.mode || 'STANDBY'}
                </span>
                {requiresMarquee && (
                  <span className="text-amber-400/80 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Marquee Auto-Scroll Active (&gt;8 chars)
                  </span>
                )}
                <span>
                  {payload?.dispatched_at
                    ? `TX: ${new Date(payload.dispatched_at).toLocaleTimeString()}`
                    : 'AWAITING TX'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* JSON Payload Inspector Accordion */}
      {showPayloadJson && (
        <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono-code text-slate-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">
              Dispatched Peripheral Payload (HTTP POST /display)
            </span>
            <span className="text-[10px] text-slate-500">Destination: http://{device.ip_address}/display</span>
          </div>
          <pre className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 overflow-x-auto text-[11px] text-emerald-400 leading-relaxed">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      )}

      {/* Offline Alert Bar with Manual Retry Button per Section 6 */}
      {!isOnline && (
        <div className="mt-3 p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <p className="font-semibold text-rose-100">Wi-Fi / Controller Drop Detected</p>
              <p className="text-rose-300/80 text-[11px]">
                LED board failed heartbeat check. Visual notifications are paused until reconnected.
              </p>
            </div>
          </div>
          {onRetryLed && (
            <button
              onClick={onRetryLed}
              disabled={isRetrying}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition text-xs shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Retrying...' : 'Retry LED Board'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
