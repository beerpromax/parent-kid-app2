import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { ParticipantPicker } from './ParticipantPicker';
import { MoodEnergyPicker } from './MoodEnergyPicker';
import { PhotoUploader } from './PhotoUploader';
import { PhotoGallery } from './PhotoGallery';
import { PhotoLightbox } from './PhotoLightbox';
import { GrowthLogEntry, PhotoRef, MoodTag, EnergyTag } from '../../lib/types';
import { useProfile } from '../context/ProfileContext';
import { createEntry, updateEntry } from '../../lib/repos/growthlog.repo';
import { deleteEntryPhoto } from '../../lib/storage';
import { familyLocalDate } from '../../lib/datetime';
import { toast } from 'sonner';

interface EntryComposerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: GrowthLogEntry;
  kidId: string;
}

export const EntryComposerDialog: React.FC<EntryComposerDialogProps> = ({
  isOpen,
  onClose,
  entry,
  kidId
}) => {
  const { familyId, currentProfile } = useProfile();
  
  // Create a stable entry ID for photo uploads. If editing, use the entry ID. If new, generate a stable temp one.
  const [entryId] = useState(() => entry?.id || `entry_${Math.random().toString(36).substr(2, 9)}`);
  
  const [date, setDate] = useState(() => entry?.date || familyLocalDate());
  const [title, setTitle] = useState(entry?.title || '');
  const [activityContent, setActivityContent] = useState(entry?.activityContent || '');
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(entry?.durationMinutes);
  const [participantProfileIds, setParticipantProfileIds] = useState<string[]>(entry?.participantProfileIds || [kidId]);
  const [participantNames, setParticipantNames] = useState<string[]>(entry?.participantNames || []);
  const [moodTag, setMoodTag] = useState<MoodTag | undefined>(entry?.moodTag);
  const [energyTag, setEnergyTag] = useState<EnergyTag | undefined>(entry?.energyTag);
  const [note, setNote] = useState(entry?.note || '');
  const [photos, setPhotos] = useState<PhotoRef[]>(entry?.photos || []);
  
  // Lightbox previews
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // If entry details change or pre-fill is updated, reset values
  useEffect(() => {
    if (entry) {
      setDate(entry.date);
      setTitle(entry.title || '');
      setActivityContent(entry.activityContent);
      setDurationMinutes(entry.durationMinutes);
      setParticipantProfileIds(entry.participantProfileIds || [kidId]);
      setParticipantNames(entry.participantNames || []);
      setMoodTag(entry.moodTag);
      setEnergyTag(entry.energyTag);
      setNote(entry.note || '');
      setPhotos(entry.photos || []);
    }
  }, [entry, kidId]);

  const handleRemovePhoto = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;
    
    try {
      await deleteEntryPhoto(photo);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success("Photo removed");
    } catch (err) {
      toast.error("Failed to delete photo from storage");
    }
  };

  const handlePhotoUploadComplete = (photoRef: PhotoRef) => {
    setPhotos((prev) => [...prev, photoRef]);
  };

  const handleSave = async () => {
    if (!activityContent.trim()) {
      toast.error('Activity content description is required.');
      return;
    }
    if (!date) {
      toast.error('Date is required.');
      return;
    }
    if (durationMinutes !== undefined && durationMinutes !== null && durationMinutes < 0) {
      toast.error('Duration must be greater than or equal to 0.');
      return;
    }

    try {
      const dataPayload = {
        kidId,
        date,
        title: title.trim(),
        activityContent: activityContent.trim(),
        durationMinutes: durationMinutes || undefined,
        participantProfileIds,
        participantNames,
        moodTag,
        energyTag,
        note: note.trim(),
        photos,
        createdByProfileId: entry?.createdByProfileId || currentProfile?.id || 'profile_parent',
        linkedCompletionId: entry?.linkedCompletionId,
        linkedActivityId: entry?.linkedActivityId
      };

      if (entry) {
        // Edit mode
        await updateEntry(familyId, entry.id, dataPayload);
        toast.success('Log entry updated successfully');
      } else {
        // Create mode
        // Override with our predefined stable entryId so photo paths are preserved perfectly
        await createEntry(familyId, {
          ...dataPayload,
          id: entryId
        } as any);
        toast.success('Log entry added successfully');
      }
      onClose();
    } catch (err: any) {
      toast.error(`Failed to save entry: ${err.message}`);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-xl w-full max-h-[90vh] flex flex-col justify-between overflow-hidden bg-card border border-border rounded-xl shadow-lg z-50 p-0">
          
          {/* Header Panel */}
          <div className="p-6 pb-4 border-b border-border/60">
            <DialogTitle className="text-lg font-bold text-foreground">
              {entry ? 'Edit Growth Log Entry' : 'New Growth Log Entry'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {entry 
                ? 'Update the log details and photos representing the child’s accomplishments.'
                : 'Capture an event, learning chore, or special milestone for the timeline.'}
            </DialogDescription>
          </div>

          {/* Form scroll area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground" htmlFor="entry-title">
                Title <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="entry-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Finished Lego Castle Assembly"
                className="text-xs h-9"
              />
            </div>

            {/* Date & Duration Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground" htmlFor="entry-date">
                  Date
                </Label>
                <Input
                  id="entry-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground" htmlFor="entry-duration">
                  Duration <span className="text-[10px] text-muted-foreground font-normal">(Minutes, optional)</span>
                </Label>
                <Input
                  id="entry-duration"
                  type="number"
                  min="0"
                  value={durationMinutes === undefined ? '' : durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value === '' ? undefined : Number(e.target.value))}
                  placeholder="e.g. 45"
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Description (activityContent) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground" htmlFor="entry-content">
                What happened? <span className="text-destructive font-bold">*</span>
              </Label>
              <Textarea
                id="entry-content"
                value={activityContent}
                onChange={(e) => setActivityContent(e.target.value)}
                placeholder="Write description of the activity or milestone..."
                rows={3}
                className="text-xs"
              />
            </div>

            {/* Short Note */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground" htmlFor="entry-note">
                Short Notes <span className="text-[10px] text-muted-foreground font-normal">(Reflections, quotes, optional)</span>
              </Label>
              <Input
                id="entry-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Mia was very proud and didn't give up once!"
                className="text-xs h-9"
              />
            </div>

            {/* Pickers (Mood/Energy and Participant list) */}
            <ParticipantPicker
              selectedProfileIds={participantProfileIds}
              onProfileIdsChange={setParticipantProfileIds}
              selectedNames={participantNames}
              onNamesChange={setParticipantNames}
            />

            <MoodEnergyPicker
              selectedMood={moodTag}
              onMoodChange={setMoodTag}
              selectedEnergy={energyTag}
              onEnergyChange={setEnergyTag}
            />

            {/* Photo upload and attachments gallery */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <Label className="text-xs font-bold text-foreground block">
                Attach Photos <span className="text-[10px] text-muted-foreground font-normal">(Maximum 8 photos)</span>
              </Label>
              
              <PhotoUploader
                entryId={entryId}
                kidId={kidId}
                currentPhotosCount={photos.length}
                onPhotoUploadComplete={handlePhotoUploadComplete}
                disabled={photos.length >= 8}
              />

              {photos.length > 0 && (
                <div className="space-y-2 mt-2">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">
                    Attached photos ({photos.length})
                  </span>
                  <PhotoGallery
                    photos={photos}
                    onRemovePhoto={handleRemovePhoto}
                    onPhotoTap={(idx) => {
                      setLightboxIndex(idx);
                      setLightboxOpen(true);
                    }}
                  />
                </div>
              )}
            </div>

          </div>

          {/* Footer Panel */}
          <DialogFooter className="p-4 bg-muted/20 border-t border-border/60 flex flex-row gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold cursor-pointer h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer h-9 px-5"
            >
              Save Entry
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* Embedded Lightbox */}
      {lightboxOpen && (
        <PhotoLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          initialIndex={lightboxIndex}
          photos={photos}
          onDeletePhoto={handleRemovePhoto}
        />
      )}
    </>
  );
};
