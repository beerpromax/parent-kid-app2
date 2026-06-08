import { GrowthLogEntry } from './types';

export function familyLocalDate(ts?: number): string {
  const date = ts ? new Date(ts) : new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getFriendlyDateLabel(dateStr: string): string {
  const today = familyLocalDate();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = familyLocalDate(yesterdayDate.getTime());

  if (dateStr === today) {
    return 'Today';
  } else if (dateStr === yesterday) {
    return 'Yesterday';
  }

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    const currentYear = new Date().getFullYear();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };
    if (year !== currentYear) {
      options.year = 'numeric';
    }
    return date.toLocaleDateString(undefined, options);
  }

  return dateStr;
}

export function groupEntriesByDate(entries: GrowthLogEntry[]): { date: string; label: string; entries: GrowthLogEntry[] }[] {
  const groups: Record<string, GrowthLogEntry[]> = {};
  
  for (const entry of entries) {
    if (!groups[entry.date]) {
      groups[entry.date] = [];
    }
    groups[entry.date].push(entry);
  }

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return sortedDates.map((date) => ({
    date,
    label: getFriendlyDateLabel(date),
    entries: groups[date],
  }));
}
