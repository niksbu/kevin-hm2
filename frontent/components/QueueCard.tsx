import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Users,
  Clock,
  RefreshCw,
  AlertTriangle,
  RotateCw,
  MoreVertical,
  Volume2,
} from 'lucide-react';
import { WaitlistEntry } from '../types';

interface QueueCardProps {
  entry: WaitlistEntry;
  index: number;
  isControllerOnline: boolean;
  onCallParty: (id: string) => Promise<void>;
  onSeatParty: (id: string) => Promise<void>;
  onCancelParty: (id: string) => Promise<void>;
  onRetryLed?: (id: string) => Promise<void>;
}

export const QueueCard: React.FC<QueueCardProps> = ({
  entry,
  index,
  isControllerOnline,
  onCallParty,
  onSeatParty,
  onCancelParty,
  onRetryLed,
}) => {
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(60);
  const [isCalling, setIsCalling] = useState(false);
  const [isSeating, setIsSeating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Live timer for elapsed wait time
  useEffect(() => {
    const updateElapsed = () => {
      const created = new Date(entry.created_at).getTime();
      const diff = Math.max(0, Math.floor((Date.now() - created) / 60000));
      setElapsedMinutes(diff);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 15000);
    return () => clearInterval(interval);
  }, [entry.created_at]);

  // Active 60-second countdown for CALLED status
  useEffect(() => {
    if (entry.status !== 'CALLED' || !entry.called_at) return;

    const updateCountdown = () => {
      const called = new Date(entry.called_at!).getTime();
      const elapsedSec = Math.floor((Date.now() - called) / 1000);
      const remaining = Math.max(0, 60 - elapsedSec);
      setCountdownSeconds(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [entry.status, entry.called_at]);

  const handleCall = async () => {
    try {
      setIsCalling(true);
      await onCallParty(entry.id);
    } finally {
      setIsCalling(false);
    }
  };

  const handleSeat = async () => {
    try {
      setIsSeating(true);
      await onSeatParty(entry.id);
    } finally {
      setIsSeating(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsCancelling(true);
      await onCancelParty(entry.id);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRetryLed = async () => {
    if (!onRetryLed) return;
    try {
      setIsRetrying(true);
      await onRetryLed(entry.id);
    } finally {
      setIsRetrying(false);
    }
  };

  const isCalled = entry.status === 'CALLED';

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 transition-all relative ${
        isCalled
          ? 'bg-amber-950/30 border-2 border-amber-500 shadow-xl shadow-amber-500/10'
          : 'bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md'
      }`}
    >
      {/* Top Banner for CALLED status */}
      {isCalled && (
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-amber-500/30 text-xs">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="tracking-wide uppercase text-[11px]">ACTIVE CALL NOTICE ON LED BOARD</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono-code text-amber-300 font-semibold text-xs">
              {countdownSeconds > 0 ? `Recall timer: ${countdownSeconds}s` : 'Call expired'}
            </span>
          </div>
        </div>
      )}

      {/* Main Party Row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Left side: Token & Party details */}
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Daily Token Badge */}
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center font-mono-code shrink-0 shadow-inner border ${
              isCalled
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                : 'bg-slate-950 text-amber-400 border-slate-700 font-bold'
            }`}
          >
            <span className="text-[10px] uppercase font-semibold leading-none text-slate-400">Token</span>
            <span className="text-xl sm:text-2xl leading-none mt-0.5">#{entry.token_number}</span>
          </div>

          {/* Party Name, Size & Notes */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {entry.party_name}
              </h3>

              {/* Party Size Pill */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                <Users className="w-3 h-3 text-slate-400" />
                <span>{entry.party_size} {entry.party_size === 1 ? 'guest' : 'guests'}</span>
              </span>

              {/* Wait Time Indicator */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                  elapsedMinutes > 25
                    ? 'bg-rose-950/60 text-rose-300 border border-rose-800'
                    : 'bg-slate-800/60 text-slate-400'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>{elapsedMinutes}m waiting</span>
              </span>
            </div>

            {/* Table / Seating Notes */}
            {entry.notes && (
              <p className="text-xs text-amber-300/90 mt-1 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 inline-block">
                {entry.notes}
              </p>
            )}

            <div className="text-[11px] text-slate-500 mt-1">
              Position: <span className="font-semibold text-slate-400">#{index + 1}</span> in FIFO queue • Logged at{' '}
              {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Right side: Touch Action Controls (Large, Ergonomic >=44px) */}
        <div className="flex flex-wrap items-center gap-2 self-center sm:self-auto w-full sm:w-auto justify-end mt-2 sm:mt-0">
          {/* SPEC EDGE CASE: Microcontroller Offline Warning & Retry LED Button */}
          {!isControllerOnline && isCalled && (
            <div className="flex items-center gap-1.5 mr-1">
              <span
                title="LED matrix failed to receive packet"
                className="p-2 rounded-lg bg-rose-950 text-rose-300 border border-rose-700"
              >
                <AlertTriangle className="w-4 h-4" />
              </span>
              <button
                onClick={handleRetryLed}
                disabled={isRetrying}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md disabled:opacity-50 min-h-[44px]"
                title="Manual retry LED dispatch per spec"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>Retry LED</span>
              </button>
            </div>
          )}

          {/* ACTION BUTTONS BASED ON STATE */}
          {entry.status === 'WAITING' ? (
            <>
              {/* Primary Call Button */}
              <button
                onClick={handleCall}
                disabled={isCalling}
                className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition transform active:scale-95 cursor-pointer min-h-[44px] min-w-[130px]"
              >
                <Bell className="w-4 h-4 text-slate-950" />
                <span>{isCalling ? 'Calling...' : 'Call Party'}</span>
              </button>

              {/* Direct Seat Button */}
              <button
                onClick={handleSeat}
                disabled={isSeating}
                title="Seat immediately without waiting"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-700 border border-slate-700 text-slate-300 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>

              {/* Cancel Button */}
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                title="Mark as absent / cancel"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-700 border border-slate-700 text-slate-400 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </>
          ) : (
            /* CALLED STATE ACTIONS */
            <>
              {/* Primary Confirm Seat Button */}
              <button
                onClick={handleSeat}
                disabled={isSeating}
                className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition transform active:scale-95 cursor-pointer min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>{isSeating ? 'Seating...' : 'Confirm Seated'}</span>
              </button>

              {/* Re-call / Flash Again */}
              <button
                onClick={handleCall}
                disabled={isCalling}
                title="Recall party and re-flash LED board"
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer min-h-[44px]"
              >
                <Volume2 className="w-4 h-4" />
                <span className="hidden sm:inline">Recall</span>
              </button>

              {/* No Show / Cancel */}
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                title="Mark as No-Show"
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 border border-slate-700 text-slate-400 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer min-h-[44px]"
              >
                <XCircle className="w-4 h-4" />
                <span className="hidden sm:inline">No-Show</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar for 60s countdown in CALLED state */}
      {isCalled && (
        <div className="w-full bg-slate-950 h-1.5 rounded-full mt-3 overflow-hidden border border-amber-500/20">
          <div
            className="bg-amber-500 h-full transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, (countdownSeconds / 60) * 100))}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};
