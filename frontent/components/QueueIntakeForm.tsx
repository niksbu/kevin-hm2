import React, { useState } from 'react';
import {
  UserPlus,
  Users,
  Plus,
  Minus,
  Sparkles,
  Tag,
} from 'lucide-react';
import { CreateWaitlistEntryInput } from '../types';

interface QueueIntakeFormProps {
  onAddParty: (input: CreateWaitlistEntryInput) => Promise<void>;
  isSubmitting?: boolean;
}

const COMMON_PARTY_SIZES = [1, 2, 3, 4, 5, 6, 8, 10];

const QUICK_TAGS = [
  'Patio',
  'Booth',
  'High Chair',
  'Wheelchair / ADA',
  'Bar Area',
  'Window Table',
  'Birthday',
];

export const QueueIntakeForm: React.FC<QueueIntakeFormProps> = ({
  onAddParty,
  isSubmitting = false,
}) => {
  const [partyName, setPartyName] = useState('');
  const [partySize, setPartySize] = useState<number>(2);
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTagToggle = (tag: string) => {
    let updatedTags: string[];
    if (selectedTags.includes(tag)) {
      updatedTags = selectedTags.filter((t) => t !== tag);
    } else {
      updatedTags = [...selectedTags, tag];
    }
    setSelectedTags(updatedTags);

    // Merge tags with current notes
    const currentCustomNotes = notes
      .split('•')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !QUICK_TAGS.includes(s))
      .join(' • ');

    if (updatedTags.length > 0) {
      setNotes(currentCustomNotes ? `${updatedTags.join(' • ')} • ${currentCustomNotes}` : updatedTags.join(' • '));
    } else {
      setNotes(currentCustomNotes);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) {
      setErrorMessage('Please enter guest surname or party name');
      return;
    }

    setErrorMessage(null);

    try {
      await onAddParty({
        party_name: partyName.trim(),
        party_size: partySize,
        notes: notes.trim() || undefined,
      });

      // Clear input on success
      setPartyName('');
      setPartySize(2);
      setNotes('');
      setSelectedTags([]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add party to queue');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white uppercase">
              Fast Party Intake
            </h2>
            <p className="text-xs text-slate-400">
              Adds to FIFO waitlist & dispatches sequential daily token
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
          POST /api/queue
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Notification */}
        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Row 1: Guest Surname / Party Name (Large touch target) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Guest Name / Surname <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              placeholder="e.g. Miller, Henderson, Walker"
              maxLength={50}
              autoFocus
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 rounded-xl px-4 py-3 text-base text-white placeholder-slate-500 transition outline-none font-medium"
            />
            {partyName && (
              <button
                type="button"
                onClick={() => setPartyName('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs px-2 py-1 bg-slate-800 rounded"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Party Size Quick Selectors (Touch Ergonomics) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Party Size: <span className="text-amber-400 text-sm font-bold font-mono-code">{partySize} Guests</span>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPartySize(Math.max(1, partySize - 1))}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Decrease size"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPartySize(partySize + 1)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Increase size"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Party Size Buttons */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {COMMON_PARTY_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setPartySize(size)}
                className={`py-2 px-1 rounded-xl text-sm font-bold font-mono-code border transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                  partySize === size
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {size} {size === 10 ? '+' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Quick Preferences & Table Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Table Preferences & Accessibility
          </label>

          {/* Quick Tag Chips */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {QUICK_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400/80'
                      : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 border-slate-800'
                  }`}
                >
                  <Tag className="w-2.5 h-2.5" />
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special requests: high chair, patio, booth, quiet..."
            maxLength={120}
            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 transition outline-none"
          />
        </div>

        {/* Large Ergonomic Touch Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !partyName.trim()}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-700 text-slate-950 font-bold text-sm sm:text-base py-3.5 px-6 rounded-xl shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 transition transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[48px]"
        >
          <Sparkles className="w-4 h-4 text-slate-950" />
          <span>{isSubmitting ? 'Issuing Token...' : `Add "${partyName || 'Party'}" to Waitlist`}</span>
        </button>
      </form>
    </div>
  );
};
