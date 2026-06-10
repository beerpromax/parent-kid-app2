import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { PhotoRef } from '../../lib/types';
import { useProfile } from '../context/ProfileContext';
import { removePhotoFromEntry } from '../../lib/repos/growthlog.repo';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';

interface PhotoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  initialIndex: number;
  photos: PhotoRef[];
  entryId?: string;
  onDeletePhoto?: (photoId: string) => Promise<void>;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  isOpen,
  onClose,
  initialIndex,
  photos,
  entryId,
  onDeletePhoto
}) => {
  const { familyId } = useProfile();
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index, photos]);

  if (!photos || photos.length === 0) return null;

  const currentPhoto = photos[index];

  const handlePrev = () => {
    setIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const handleDelete = async () => {
    if (!currentPhoto) return;
    
    const confirmDelete = window.confirm("Are you sure you want to delete this photo?");
    if (!confirmDelete) return;

    try {
      if (onDeletePhoto) {
        await onDeletePhoto(currentPhoto.id);
      } else if (familyId && entryId) {
        await removePhotoFromEntry(familyId, entryId, currentPhoto.id);
      }
      
      toast.success("Photo deleted");
      
      if (photos.length <= 1) {
        onClose();
      } else {
        // Adjust the index so we don't index out of bounds
        setIndex((prev) => (prev >= photos.length - 1 ? photos.length - 2 : prev));
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete photo");
    }
  };

  const canDelete = !!onDeletePhoto || (!!familyId && !!entryId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full h-[85vh] p-0 overflow-hidden bg-black/95 border-none flex flex-col justify-between items-center z-50">
        <DialogTitle className="sr-only">Photo Viewer</DialogTitle>
        
        {/* Top bar */}
        <div className="w-full flex justify-between items-center px-4 py-3 bg-black/40 text-white z-10">
          <span className="text-xs font-semibold select-none">
            {index + 1} of {photos.length}
          </span>
          <div className="flex items-center gap-2">
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="h-8 w-8 text-neutral-400 hover:text-red-400 hover:bg-white/10 rounded-full cursor-pointer"
                title="Delete Photo"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Center Display Panel */}
        <div className="flex-1 w-full flex items-center justify-center relative px-10">
          {/* Previous Arrow */}
          {photos.length > 1 && (
            <button
              onClick={handlePrev}
              className="absolute left-3 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer z-10"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Image */}
          <div className="max-w-full max-h-[70vh] flex items-center justify-center">
            <ImageWithFallback
              src={currentPhoto.downloadURL}
              alt="Lightbox View"
              className="max-w-full max-h-[70vh] object-contain rounded-sm select-none animate-in zoom-in-95 duration-200"
            />
          </div>

          {/* Next Arrow */}
          {photos.length > 1 && (
            <button
              onClick={handleNext}
              className="absolute right-3 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer z-10"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </div>

        {/* Bottom bar for spacing */}
        <div className="w-full h-4 bg-black/40" />
      </DialogContent>
    </Dialog>
  );
};
