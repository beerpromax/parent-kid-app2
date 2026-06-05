import React from 'react';
import { Flame } from 'lucide-react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface StreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
  showLongest?: boolean;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  currentStreak,
  longestStreak,
  className = '',
  showLongest = true,
}) => {
  const active = currentStreak > 0;

  const content = (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 font-bold rounded-full border-none shadow-sm py-1.5 transition-all duration-300 ${
        active
          ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/15'
          : 'bg-muted text-muted-foreground/60'
      } ${className}`}
    >
      <Flame
        className={`w-4 h-4 transition-transform ${active ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-muted-foreground/40'}`}
      />
      <span>{currentStreak} Day{currentStreak === 1 ? '' : 's'}</span>
    </Badge>
  );

  if (!showLongest) return content;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent className="bg-card border border-border text-foreground text-xs p-2 rounded-md shadow-md">
          <p className="font-bold">Daily Streak</p>
          <p className="text-muted-foreground">Complete at least 1 task every day to keep it going!</p>
          <p className="mt-1 font-semibold text-primary">Longest Streak: {longestStreak} days</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
