import React, { useState } from 'react';
import {
  X,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  BarChart3,
} from 'lucide-react';
import { WaitlistEntry, QueueAnalytics } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: WaitlistEntry[];
  analytics: QueueAnalytics;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  entries,
  analytics,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'SEATED' | 'CANCELLED'>('ALL');

  if (!isOpen) return null;

  const completedEntries = entries.filter(
    (e) => e.status === 'SEATED' || e.status === 'CANCELLED'
  );

  const filtered = completedEntries.filter((e) => {
    if (filter === 'SEATED') return e.status === 'SEATED';
    if (filter === 'CANCELLED') return e.status === 'CANCELLED';
    return true;
  });

  const calculateWaitDuration = (entry: WaitlistEntry) => {
    if (!entry.created_at) return null;
    const end = entry.seated_at || entry.completed_at;
    if (!end) return null;
    const startMs = new Date(entry.created_at).getTime();
    const endMs = new Date(end).getTime();
    const diffMins = Math.max(1, Math.round((endMs - startMs) / 60000));
    return `${diffMins} min`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Waitlist Service History</h2>
              <p className="text-xs text-slate-400">Completed & Archived Parties for today</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Analytics Summary Bar */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-slate-950/60 border-b border-slate-800 text-center">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] uppercase font-semibold text-slate-400 block">Total Seated</span>
            <span className="text-xl font-bold font-mono-code text-emerald-400">{analytics.totalSeated}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] uppercase font-semibold text-slate-400 block">Avg Wait Time</span>
            <span className="text-xl font-bold font-mono-code text-amber-400">{analytics.avgWaitMinutes} min</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] uppercase font-semibold text-slate-400 block">Cancelled / No-Show</span>
            <span className="text-xl font-bold font-mono-code text-rose-400">{analytics.totalCancelled}</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border-b border-slate-800 text-xs">
          <span className="text-slate-400 font-medium mr-1">Filter:</span>
          {(['ALL', 'SEATED', 'CANCELLED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                filter === f
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
          <span className="ml-auto text-slate-500 text-xs">
            Showing {filtered.length} entries
          </span>
        </div>

        {/* Entries List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-slate-800/40">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No completed waitlist entries for this filter yet.
            </div>
          ) : (
            filtered.map((entry) => {
              const waitDuration = calculateWaitDuration(entry);
              const isSeated = entry.status === 'SEATED';

              return (
                <div
                  key={entry.id}
                  className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                        isSeated
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                          : 'bg-rose-950/60 text-rose-400 border-rose-800'
                      }`}
                    >
                      {isSeated ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-code text-xs text-amber-400 font-bold">
                          #{entry.token_number}
                        </span>
                        <span className="font-semibold text-white">{entry.party_name}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {entry.party_size}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-slate-400 mt-0.5">{entry.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        isSeated
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {entry.status}
                    </span>
                    {waitDuration && (
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Wait: {waitDuration}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};
