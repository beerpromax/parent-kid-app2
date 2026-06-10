import React from 'react';
import { GrowthLogEntry, MoodTag } from '../../lib/types';
import { MOOD_DETAILS } from './GrowthEntryCard';
import { Smile } from 'lucide-react';

interface MoodSummaryChipProps {
  entries: GrowthLogEntry[];
}

export const MoodSummaryChip: React.FC<MoodSummaryChipProps> = ({ entries }) => {
  // Filter for entries that have a mood tag and sort them by date (newest first)
  const entriesWithMoods = entries
    .filter((e) => !!e.moodTag)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (entriesWithMoods.length === 0) {
    return (
      <div className="inline-flex items-center gap-1 bg-muted px-2.5 py-1 rounded-full text-[10px] font-bold text-muted-foreground select-none">
        <Smile className="w-3 h-3" />
        No moods logged
      </div>
    );
  }

  // Get the last 7 entries with mood
  const recentEntries = entriesWithMoods.slice(0, 7);
  
  // Calculate frequencies
  const frequencies: Record<MoodTag, number> = {} as any;
  recentEntries.forEach((e) => {
    const m = e.moodTag!;
    frequencies[m] = (frequencies[m] || 0) + 1;
  });

  // Find dominant mood
  let dominantMood: MoodTag | null = null;
  let maxFreq = 0;
  
  Object.entries(frequencies).forEach(([tag, freq]) => {
    if (freq > maxFreq) {
      maxFreq = freq;
      dominantMood = tag as MoodTag;
    }
  });

  if (!dominantMood) return null;

  const moodDetails = MOOD_DETAILS[dominantMood];

  return (
    <div
      className="group relative inline-flex items-center gap-1.5 bg-card border border-border/70 hover:border-primary/40 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs select-none transition-all duration-300"
      title="Dominant mood over recent entries"
    >
      <span className="text-sm leading-none">{moodDetails.emoji}</span>
      <span className="text-muted-foreground">Recent Mood:</span>
      <span className={moodDetails.text}>{moodDetails.label}</span>

      {/* Hover tooltip for mood history trail */}
      <div className="absolute top-full mt-2 left-1/2 translate-x-[-50%] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/90 text-white text-[10px] p-2.5 rounded-lg whitespace-nowrap shadow-md z-30 flex flex-col gap-1.5 items-center">
        <span className="font-bold text-neutral-400 border-b border-white/10 pb-1 w-full text-center">
          Last {recentEntries.length} entries mood
        </span>
        <div className="flex gap-1.5 items-center">
          {recentEntries.map((e, idx) => {
            const mDetails = MOOD_DETAILS[e.moodTag!];
            return (
              <span key={idx} title={mDetails.label} className="text-base cursor-default hover:scale-115 transition">
                {mDetails.emoji}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
