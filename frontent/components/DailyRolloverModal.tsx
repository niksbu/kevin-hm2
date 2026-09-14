import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DailySequenceState } from '../types';

interface DailyRolloverModalProps {
  isOpen: boolean;
  onClose: () => void;
  sequence: DailySequenceState;
  onExecuteRollover: () => Promise<void>;
}

export const DailyRolloverModal: React.FC<DailyRolloverModalProps> = ({
  isOpen,
  onClose,
  sequence,
  onExecuteRollover,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  if (!isOpen) return null;

  const handleExecute = async () => {
    try {
      setIsProcessing(true);
      await onExecuteRollover();
      setSuccessNotice(true);
      setTimeout(() => {
        setSuccessNotice(false);
        onClose();
      }, 1500);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Daily Token Rollover</h2>
              <p className="text-xs text-slate-400">Section 6 & 7 Cron Task & Sequence Control</p>
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
        <div className="p-5 space-y-4">
          {successNotice ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Rollover Completed Successfully</h3>
              <p className="text-xs text-slate-400">
                Daily token sequence reset to #1. New business day started.
              </p>
            </div>
          ) : (
            <>
              {/* Current Status Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" /> Active Business Date:
                  </span>
                  <span className="font-mono-code font-bold text-white">{sequence.business_date}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Current Token Issued:</span>
                  <span className="font-mono-code font-bold text-amber-400">#{sequence.current_token}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5" /> Scheduled Cron Auto-Reset:
                  </span>
                  <span className="font-mono-code text-slate-300">04:00 AM Daily</span>
                </div>
              </div>

              {/* Warning Notice */}
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Executing daily rollover resets the token sequence back to <span className="font-bold">#1</span>.
                  Any remaining uncalled parties from the previous shift will be marked as archived.
                </p>
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 bg-slate-950"
                />
                <span>Confirm start of new business day shift & reset sequence</span>
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        {!successNotice && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleExecute}
              disabled={!confirmed || isProcessing}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Resetting Sequence...' : 'Execute Rollover (#1)'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
