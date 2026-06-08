import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useProfile } from '../../context/ProfileContext';
import { Timeline } from '../../components/Timeline';
import { Button } from '../../components/ui/button';
import { Plus, BookOpen, Users, Trash2 } from 'lucide-react';
import { EntryComposerDialog } from '../../components/EntryComposerDialog';
import { PhotoLightbox } from '../../components/PhotoLightbox';
import { TrashBinDialog } from '../../components/TrashBinDialog';
import { GrowthLogEntry, PhotoRef } from '../../../lib/types';
import { MoodSummaryChip } from '../../components/MoodSummaryChip';

export const GrowthLog: React.FC = () => {
  const { profiles } = useProfile();
  const { growthLog, growthLogLoading, viewedKidId, setViewedKidId } = useData();
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GrowthLogEntry | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  
  // Lightbox States
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxPhotos, setLightboxPhotos] = useState<PhotoRef[]>([]);

  const kids = profiles.filter((p) => p.role === 'kid');
  const activeKid = kids.find((k) => k.id === viewedKidId);

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
    if (!viewedKidId) return;
    setEditingEntry(null);
    setComposerOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground font-sans">Growth Journeys</h2>
          <p className="text-sm text-muted-foreground">Follow and document each child's learning history and achievements</p>
        </div>
        
        {viewedKidId && (
          <div className="flex items-center gap-3 self-end sm:self-auto">
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
        )}
      </div>

      {/* Kids Switcher Bar */}
      <div className="flex border-b border-border/60 pb-3 gap-2 overflow-x-auto">
        {kids.map((kid) => {
          const isActive = kid.id === viewedKidId;
          return (
            <button
              key={kid.id}
              onClick={() => setViewedKidId(kid.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary border-primary text-primary-foreground font-bold shadow-sm'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <span className="text-base">{kid.emoji || '👧'}</span>
              <span>{kid.name}</span>
            </button>
          );
        })}
      </div>

      {viewedKidId ? (
        <Timeline
          entries={growthLog}
          loading={growthLogLoading}
          onEdit={handleEdit}
          onPhotoTap={handlePhotoTap}
          onAddClick={handleCreate}
        />
      ) : (
        <EmptyState
          icon={Users}
          title="No children registered"
          description="Initialize children profiles in the dashboard to see their growth logs."
        />
      )}

      {composerOpen && viewedKidId && (
        <EntryComposerDialog
          isOpen={composerOpen}
          onClose={() => {
            setComposerOpen(false);
            setEditingEntry(null);
          }}
          entry={editingEntry || undefined}
          kidId={viewedKidId}
        />
      )}

      {lightboxOpen && (
        <PhotoLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          initialIndex={lightboxIndex}
          photos={lightboxPhotos}
          entryId={editingEntry?.id} 
        />
      )}

      {trashOpen && viewedKidId && (
        <TrashBinDialog
          isOpen={trashOpen}
          onClose={() => setTrashOpen(false)}
          kidId={viewedKidId}
        />
      )}
    </div>
  );
};
