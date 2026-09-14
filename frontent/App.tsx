import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Layers,
  Sparkles,
  BellRing,
} from 'lucide-react';
import {
  WaitlistEntry,
  DisplayDevice,
  HardwarePayload,
  DailySequenceState,
  QueueAnalytics,
  CreateWaitlistEntryInput,
} from './types';
import { backendApi } from './api';
import { HostNavbar } from './components/HostNavbar';
import { LedMatrixSimulator } from './components/LedMatrixSimulator';
import { QueueIntakeForm } from './components/QueueIntakeForm';
import { QueueCard } from './components/QueueCard';
import { HistoryModal } from './components/HistoryModal';
import { DailyRolloverModal } from './components/DailyRolloverModal';
import { HardwareStatusModal } from './components/HardwareStatusModal';
import { soundManager } from './utils/sound';

export default function FrontendApp() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [device, setDevice] = useState<DisplayDevice | null>(null);
  const [payload, setPayload] = useState<HardwarePayload | null>(null);
  const [sequence, setSequence] = useState<DailySequenceState | null>(null);
  const [analytics, setAnalytics] = useState<QueueAnalytics>({
    totalWaiting: 0,
    totalSeated: 0,
    totalCancelled: 0,
    avgWaitMinutes: 15,
    activePartyCount: 0,
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState<'ALL' | '1-2' | '3-4' | '5+'>('ALL');
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);
  const [isRetryingLed, setIsRetryingLed] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'info' } | null>(null);

  // Modals
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [isHardwareOpen, setIsHardwareOpen] = useState(false);

  // Show Toast
  const showToast = (text: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Synchronize state from centralized API
  const refreshData = useCallback(async () => {
    try {
      const [q, dev, pl, seq] = await Promise.all([
        backendApi.getQueue(),
        backendApi.getDevice(),
        backendApi.getHardwarePayload(),
        backendApi.getDailySequence(),
      ]);

      setEntries(q);
      setDevice(dev);
      setPayload(pl);
      setSequence(seq);
      setAnalytics(backendApi.getAnalytics());
    } catch (err) {
      console.error('Data sync failed', err);
    }
  }, []);

  // Initial load and real-time subscription
  useEffect(() => {
    refreshData();
    const unsubscribe = backendApi.subscribe(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, [refreshData]);

  // Host Action: Add Party (POST /api/queue)
  const handleAddParty = async (input: CreateWaitlistEntryInput) => {
    setIsSubmittingIntake(true);
    try {
      const created = await backendApi.addEntry(input);
      showToast(`Party #${created.token_number} (${created.party_name}) added to queue`, 'success');
      soundManager.playSeatedChime();
    } catch (err: any) {
      showToast(err.message || 'Error adding party', 'warning');
      throw err;
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  // Host Action: Call Party (POST /api/queue/{id}/call)
  const handleCallParty = async (id: string) => {
    try {
      const called = await backendApi.callParty(id);
      soundManager.playCallChime();

      if (device?.status === 'ONLINE') {
        showToast(`Dispatched calling notice for #${called.token_number} (${called.party_name}) to LED Board`, 'success');
      } else {
        soundManager.playWarningBeep();
        showToast(`Party #${called.token_number} called, but LED Board is offline!`, 'warning');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to call party', 'warning');
    }
  };

  // Host Action: Confirm Seated (PATCH /api/queue/{id}/status -> SEATED)
  const handleSeatParty = async (id: string) => {
    try {
      const seated = await backendApi.updateStatus(id, 'SEATED');
      soundManager.playSeatedChime();
      showToast(`Party #${seated.token_number} seated. LED board reverted to queue depth.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to seat party', 'warning');
    }
  };

  // Host Action: Cancel Party (PATCH /api/queue/{id}/status -> CANCELLED)
  const handleCancelParty = async (id: string) => {
    try {
      const cancelled = await backendApi.updateStatus(id, 'CANCELLED');
      showToast(`Party #${cancelled.token_number} marked as cancelled / no-show.`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel entry', 'warning');
    }
  };

  // Section 6: Retry LED Dispatch
  const handleRetryLed = async (partyId?: string) => {
    setIsRetryingLed(true);
    try {
      const activeParty = partyId || entries.find((e) => e.status === 'CALLED')?.id;
      if (!activeParty) {
        showToast('No active party calling.', 'info');
        return;
      }
      const res = await backendApi.retryLedDispatch(activeParty);
      if (res.success) {
        soundManager.playCallChime();
        showToast(res.message, 'success');
      } else {
        soundManager.playWarningBeep();
        showToast(res.message, 'warning');
      }
    } finally {
      setIsRetryingLed(false);
    }
  };

  // Toggle Microcontroller Status (Simulate Drop)
  const handleToggleDeviceStatus = async () => {
    if (!device) return;
    const nextStatus = device.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    await backendApi.setDeviceStatus(nextStatus);
    if (nextStatus === 'OFFLINE') {
      soundManager.playWarningBeep();
      showToast('Simulated Microcontroller Wi-Fi drop. Board status set to OFFLINE.', 'warning');
    } else {
      soundManager.playSeatedChime();
      showToast('Microcontroller reconnected to local LAN. Board status set to ONLINE.', 'success');
    }
  };

  // Daily Rollover
  const handleExecuteRollover = async () => {
    const newSeq = await backendApi.performDailyRollover();
    soundManager.playSeatedChime();
    showToast(`Daily rollover executed: sequence reset to #${newSeq.current_token}`, 'success');
  };

  // Reset Demo Data
  const handleResetDemoData = async () => {
    await backendApi.resetDemoData();
    showToast('Reset demo waitlist data to initial state.', 'info');
  };

  // Filter Active Queue (WAITING and CALLED)
  const activeEntries = entries.filter(
    (e) => e.status === 'WAITING' || e.status === 'CALLED'
  );

  // Separate currently CALLED party for top spotlight if any
  const calledParty = activeEntries.find((e) => e.status === 'CALLED');

  const filteredEntries = activeEntries.filter((entry) => {
    // Search query by surname or token
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const matchName = entry.party_name.toLowerCase().includes(query);
      const matchToken = entry.token_number.toString().includes(query);
      const matchNotes = entry.notes?.toLowerCase().includes(query);
      if (!matchName && !matchToken && !matchNotes) return false;
    }

    // Party size filter
    if (sizeFilter === '1-2' && entry.party_size > 2) return false;
    if (sizeFilter === '3-4' && (entry.party_size < 3 || entry.party_size > 4)) return false;
    if (sizeFilter === '5+' && entry.party_size < 5) return false;

    return true;
  });

  if (!device || !sequence) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono-code">Connecting to Local Host Stand API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-16 right-4 z-50 max-w-md px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium flex items-center gap-2.5 transition-all animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700'
              : toastMessage.type === 'warning'
              ? 'bg-amber-950/95 text-amber-200 border-amber-600'
              : 'bg-slate-900/95 text-slate-200 border-slate-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toastMessage.type === 'warning' ? (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Host Station Navbar */}
      <HostNavbar
        device={device}
        sequence={sequence}
        analytics={analytics}
        onOpenHardwareModal={() => setIsHardwareOpen(true)}
        onOpenHistoryModal={() => setIsHistoryOpen(true)}
        onOpenRolloverModal={() => setIsRolloverOpen(true)}
        onResetDemoData={handleResetDemoData}
        onToggleDeviceStatus={handleToggleDeviceStatus}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Host Summary Dashboard Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">Waiting in Queue</p>
              <p className="text-2xl sm:text-3xl font-bold font-mono-code text-white mt-0.5">
                {analytics.totalWaiting} <span className="text-xs font-normal text-slate-400">parties</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">Est. Average Wait</p>
              <p className="text-2xl sm:text-3xl font-bold font-mono-code text-amber-400 mt-0.5">
                ~{analytics.avgWaitMinutes} <span className="text-xs font-normal text-slate-400">min</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">Seated Today</p>
              <p className="text-2xl sm:text-3xl font-bold font-mono-code text-emerald-400 mt-0.5">
                {analytics.totalSeated} <span className="text-xs font-normal text-slate-400">parties</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">Tokens Issued</p>
              <p className="text-2xl sm:text-3xl font-bold font-mono-code text-indigo-400 mt-0.5">
                #{sequence.current_token}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Two-Column Responsive POS / Tablet Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: LED Display Board Simulator & Fast Intake Form */}
          <div className="lg:col-span-5 space-y-6">
            {/* LED Display Board Component (Outputs exact HUB75 state) */}
            <LedMatrixSimulator
              payload={payload}
              device={device}
              onRetryLed={() => handleRetryLed()}
              isRetrying={isRetryingLed}
            />

            {/* Fast Party Intake Form */}
            <QueueIntakeForm
              onAddParty={handleAddParty}
              isSubmitting={isSubmittingIntake}
            />
          </div>

          {/* Right Column: Live Interactive Waitlist Queue */}
          <div className="lg:col-span-7 space-y-4">
            {/* Queue Controls Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Live Waitlist Queue</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono-code font-bold bg-amber-500 text-slate-950">
                      {activeEntries.length} Active
                    </span>
                  </h2>
                  <span className="text-xs text-slate-400 hidden sm:inline">• FIFO Order</span>
                </div>

                {/* Size Filter Buttons */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-500 px-1.5 text-[11px] hidden sm:inline">Size:</span>
                  {(['ALL', '1-2', '3-4', '5+'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSizeFilter(filter)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                        sizeFilter === filter
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar for Quick Host Lookup */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Quick search by surname, token #, or request note..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* List of Active Queue Cards */}
            <div className="space-y-3">
              {filteredEntries.length === 0 ? (
                <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Waitlist is Empty</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      {searchQuery
                        ? 'No parties found matching your search filter.'
                        : 'No parties currently waiting. Use the intake panel on the left to add walk-in guests.'}
                    </p>
                  </div>
                </div>
              ) : (
                filteredEntries.map((entry, index) => (
                  <QueueCard
                    key={entry.id}
                    entry={entry}
                    index={index}
                    isControllerOnline={device.status === 'ONLINE'}
                    onCallParty={handleCallParty}
                    onSeatParty={handleSeatParty}
                    onCancelParty={handleCancelParty}
                    onRetryLed={handleRetryLed}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        entries={entries}
        analytics={analytics}
      />

      <DailyRolloverModal
        isOpen={isRolloverOpen}
        onClose={() => setIsRolloverOpen(false)}
        sequence={sequence}
        onExecuteRollover={handleExecuteRollover}
      />

      <HardwareStatusModal
        isOpen={isHardwareOpen}
        onClose={() => setIsHardwareOpen(false)}
        device={device}
        payload={payload}
        onSetStatus={async (status) => {
          await backendApi.setDeviceStatus(status);
        }}
        onSendTestDispatch={async () => {
          await handleRetryLed();
        }}
      />
    </div>
  );
}
