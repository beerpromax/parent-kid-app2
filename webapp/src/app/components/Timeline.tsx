import React, { useState } from 'react';
import { GrowthLogEntry, PhotoRef, MoodTag } from '../../lib/types';
import { GrowthEntryCard, MOOD_DETAILS } from './GrowthEntryCard';
import { groupEntriesByDate } from '../../lib/datetime';
import { EmptyState } from './EmptyState';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BookOpen, Calendar, Filter, X } from 'lucide-react';

interface TimelineProps {
  entries: GrowthLogEntry[];
  loading: boolean;
  onEdit?: (entry: GrowthLogEntry) => void;
  onPhotoTap?: (photoIndex: number, photos: PhotoRef[]) => void;
  onAddClick?: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  entries,
  loading,
  onEdit,
  onPhotoTap,
  onAddClick
}) => {
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Client-side filtering based on state
  let filteredEntries = entries;
  if (selectedMood !== 'all') {
    filteredEntries = filteredEntries.filter((e) => e.moodTag === selectedMood);
  }
  if (dateFrom) {
    filteredEntries = filteredEntries.filter((e) => e.date >= dateFrom);
  }
  if (dateTo) {
    filteredEntries = filteredEntries.filter((e) => e.date <= dateTo);
  }

  const grouped = groupEntriesByDate(filteredEntries);

  const clearFilters = () => {
    setSelectedMood('all');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = selectedMood !== 'all' || dateFrom !== '' || dateTo !== '';

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((n) => (
          <div key={n} className="space-y-3">
            <div className="h-6 w-24 bg-muted animate-pulse rounded"></div>
            <div className="space-y-4">
              <div className="border border-border rounded-xl p-5 space-y-3 bg-card animate-pulse">
                <div className="h-5 w-1/3 bg-muted rounded"></div>
                <div className="h-4 w-1/4 bg-muted rounded"></div>
                <div className="h-16 w-full bg-muted rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtering Header Panel */}
      <div className="flex flex-col gap-4 bg-card border border-border/80 p-4 rounded-xl shadow-sm">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-primary" />
            Timeline Filters
          </h4>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer h-8"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs font-semibold cursor-pointer h-8"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>
        </div>

        {/* Filters Body */}
        {(showFilters || hasActiveFilters) && (
          <div className="space-y-4 pt-2 border-t border-border/60 animate-in fade-in duration-200">
            {/* Mood selector row */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground block">Filter by Mood:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedMood('all')}
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all border ${
                    selectedMood === 'all'
                      ? 'bg-primary border-primary text-primary-foreground font-bold shadow-sm'
                      : 'bg-muted/50 hover:bg-muted border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All Moods
                </button>
                {Object.entries(MOOD_DETAILS).map(([tag, details]) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedMood(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all border flex items-center gap-1 ${
                      selectedMood === tag
                        ? 'bg-primary border-primary text-primary-foreground font-bold shadow-sm'
                        : 'bg-muted/50 hover:bg-muted border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{details.emoji}</span>
                    <span>{details.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date limits */}
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground block">From:</span>
                <div className="relative">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="text-xs h-9 cursor-pointer"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground block">To:</span>
                <div className="relative">
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="text-xs h-9 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grouped Logs display */}
      {grouped.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={hasActiveFilters ? "No matches found" : "Your Journey Log is empty"}
          description={
            hasActiveFilters
              ? "Try broadening your filters to find logged entries."
              : "Capture milestones, learning activities, or fun family moments here!"
          }
          actionText={hasActiveFilters ? "Clear Filters" : onAddClick ? "Add First Entry" : undefined}
          onAction={hasActiveFilters ? clearFilters : onAddClick}
        />
      ) : (
        <div className="relative border-l border-border/80 pl-6 ml-3 space-y-8 mt-2">
          {grouped.map((group) => (
            <div key={group.date} className="relative space-y-4">
              {/* Date node circle anchor */}
              <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 border-primary shadow-sm z-10">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>
              
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-foreground bg-muted/65 py-0.5 px-2.5 rounded-full border border-border/40 inline-block shadow-sm">
                  {group.label}
                </h4>
              </div>

              <div className="space-y-4">
                {group.entries.map((entry) => (
                  <GrowthEntryCard
                    key={entry.id}
                    entry={entry}
                    onEdit={onEdit}
                    onPhotoTap={onPhotoTap}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
