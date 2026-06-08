import React from 'react';
import { GrowthLogEntry, PhotoRef, MoodTag, EnergyTag } from '../../lib/types';
import { useProfile } from '../context/ProfileContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Calendar, Clock, Edit3, Trash2, Smile, Zap } from 'lucide-react';
import { ProfileBadge } from './ProfileBadge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { trashEntry, restoreEntry } from '../../lib/repos/growthlog.repo';
import { toast } from 'sonner';

interface GrowthEntryCardProps {
  entry: GrowthLogEntry;
  onEdit?: (entry: GrowthLogEntry) => void;
  onPhotoTap?: (photoIndex: number, photos: PhotoRef[]) => void;
}

export const MOOD_DETAILS: Record<MoodTag, { emoji: string; label: string; bg: string; text: string }> = {
  joyful: { emoji: '😄', label: 'Joyful', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
  happy: { emoji: '😊', label: 'Happy', bg: 'bg-green-500/10 dark:bg-green-500/20', text: 'text-green-600 dark:text-green-400' },
  calm: { emoji: '😌', label: 'Calm', bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' },
  meh: { emoji: '😐', label: 'Meh', bg: 'bg-gray-500/10 dark:bg-gray-500/20', text: 'text-gray-600 dark:text-gray-400' },
  tired: { emoji: '😴', label: 'Tired', bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400' },
  frustrated: { emoji: '😣', label: 'Frustrated', bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400' },
  sad: { emoji: '😢', label: 'Sad', bg: 'bg-red-500/10 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400' }
};

export const ENERGY_DETAILS: Record<EnergyTag, { emoji: string; label: string; bg: string; text: string }> = {
  low: { emoji: '🔋 low', label: 'Low Energy', bg: 'bg-sky-500/10 dark:bg-sky-500/20', text: 'text-sky-600 dark:text-sky-400' },
  medium: { emoji: '🔋🔋 med', label: 'Medium Energy', bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400' },
  high: { emoji: '⚡ high', label: 'High Energy', bg: 'bg-yellow-500/10 dark:bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400' }
};

export const GrowthEntryCard: React.FC<GrowthEntryCardProps> = ({
  entry,
  onEdit,
  onPhotoTap
}) => {
  const { familyId, profiles, currentProfile } = useProfile();

  const handleTrash = async () => {
    try {
      await trashEntry(familyId, entry.id);
      toast.success('Entry moved to trash', {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await restoreEntry(familyId, entry.id);
              toast.success('Entry restored');
            } catch (err) {
              toast.error('Failed to restore entry');
            }
          }
        }
      });
    } catch (err) {
      toast.error('Failed to trash entry');
    }
  };

  // Find profile objects for matching participants
  const participantProfiles = entry.participantProfileIds
    .map(pid => profiles.find(p => p.id === pid))
    .filter((p): p is typeof profiles[0] => !!p);

  const mood = entry.moodTag ? MOOD_DETAILS[entry.moodTag] : null;
  const energy = entry.energyTag ? ENERGY_DETAILS[entry.energyTag] : null;

  return (
    <Card className="bg-card border border-border shadow-sm hover:shadow-md transition-all duration-300 p-5 rounded-xl flex flex-col gap-4 overflow-hidden relative group">
      {/* Top Header Panel */}
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-foreground leading-snug">
              {entry.title || 'Activity Log Entry'}
            </h3>
            
            {/* Creator badge */}
            {entry.createdByProfileId !== entry.kidId && (
              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                Logged by parent
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-primary/75" />
              {entry.date}
            </span>
            {entry.durationMinutes && entry.durationMinutes > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary/75" />
                {entry.durationMinutes} min
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(entry)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleTrash}
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tags Panel (Mood / Energy) */}
      {(mood || energy) && (
        <div className="flex flex-wrap gap-2 mt-1">
          {mood && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${mood.bg} ${mood.text}`}>
              <span className="text-sm">{mood.emoji}</span>
              {mood.label}
            </span>
          )}
          {energy && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${energy.bg} ${energy.text}`}>
              <span>{energy.emoji.split(' ')[0]}</span>
              <span>{energy.label}</span>
            </span>
          )}
        </div>
      )}

      {/* Main content body */}
      <div className="text-sm text-foreground leading-relaxed font-normal whitespace-pre-wrap">
        {entry.activityContent}
      </div>

      {/* Note Panel */}
      {entry.note && (
        <div className="border-l-4 border-primary/40 bg-muted/40 px-3 py-2 rounded-r-lg text-xs italic text-muted-foreground leading-relaxed">
          "{entry.note}"
        </div>
      )}

      {/* Photos Grid */}
      {entry.photos && entry.photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-2">
          {entry.photos.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => onPhotoTap?.(index, entry.photos)}
              className="relative aspect-square border border-border/60 rounded-lg overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 bg-muted"
            >
              <ImageWithFallback
                src={photo.thumbnailURL || photo.downloadURL}
                alt="Upload thumbnail"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Footer / Participants panel */}
      {(participantProfiles.length > 0 || (entry.participantNames && entry.participantNames.length > 0)) && (
        <div className="flex items-center flex-wrap gap-2 border-t border-border/40 pt-3 mt-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground/80">With:</span>
          <div className="flex items-center -space-x-1.5 overflow-hidden">
            {participantProfiles.map((p) => (
              <div
                key={p.id}
                title={p.name}
                className="w-6 h-6 rounded-full border-2 border-card flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-transform hover:translate-y-[-2px] duration-200"
                style={{ backgroundColor: p.color || '#ff8b3d' }}
              >
                {p.emoji || p.name.charAt(0)}
              </div>
            ))}
          </div>
          {/* Custom participants list */}
          {entry.participantNames && entry.participantNames.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.participantNames.map((name, idx) => (
                <span
                  key={idx}
                  className="bg-muted px-2 py-0.5 rounded-full text-[10px] font-medium text-muted-foreground"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
