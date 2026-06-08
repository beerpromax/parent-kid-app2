import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useProfile } from '../../context/ProfileContext';
import { Timeline } from '../../components/Timeline';
import { Button } from '../../components/ui/button';
import { Plus, BookOpen, Trash2 } from 'lucide-react';
import { EntryComposerDialog } from '../../components/EntryComposerDialog';
import { PhotoLightbox } from '../../components/PhotoLightbox';
import { TrashBinDialog } from '../../components/TrashBinDialog';
import { GrowthLogEntry, PhotoRef } from '../../../lib/types';
import { MoodSummaryChip } from '../../components/MoodSummaryChip';

export const MyJourney: React.FC = () => {
  const { currentProfile } = useProfile();
  const { growthLog, growthLogLoading } = useData();
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GrowthLogEntry | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  
  // Lightbox States
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxPhotos, setLightboxPhotos] = useState<PhotoRef[]>([]);

  if (!currentProfile) return null;

  const handleEdit = (entry: GrowthLogEntry) => {
    setEditingEntry(entry);
    setComposerOpen(true);
  };

  const handlePhotoTap = (index: number, photos: PhotoRef[]) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleCreate = () => {
    setEditingEntry(null);
    setComposerOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">My Growth Journey</h2>
          <p className="text-sm text-muted-foreground">Look back at what you have done and share accomplishments</p>
        </div>
        
        <div className="flex items-center gap-3">
          <MoodSummaryChip entries={growthLog} />
          
          <Button
            variant="outline"
            onClick={() => setTrashOpen(true)}
            className="text-xs font-semibold cursor-pointer h-9 px-3 border-border hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Trash</span>
          </Button>

          <Button
            onClick={handleCreate}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </Button>
        </div>
      </div>

      <Timeline
        entries={growthLog}
        loading={growthLogLoading}
        onEdit={handleEdit}
        onPhotoTap={handlePhotoTap}
        onAddClick={handleCreate}
      />

      {composerOpen && (
        <EntryComposerDialog
          isOpen={composerOpen}
          onClose={() => {
            setComposerOpen(false);
            setEditingEntry(null);
          }}
          entry={editingEntry || undefined}
          kidId={currentProfile.id}
        />
      )}

      {lightboxOpen && (
        <PhotoLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          initialIndex={lightboxIndex}
          photos={lightboxPhotos}
          // Only show delete option inside lightbox if editing is allowed (which it is here)
          entryId={editingEntry?.id || (lightboxPhotos.length > 0 ? undefined : '')} 
        />
      )}

      {trashOpen && (
        <TrashBinDialog
          isOpen={trashOpen}
          onClose={() => setTrashOpen(false)}
          kidId={currentProfile.id}
        />
      )}
    </div>
  );
};
