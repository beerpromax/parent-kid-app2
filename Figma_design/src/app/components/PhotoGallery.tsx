import React from 'react';
import { PhotoRef } from '../../lib/types';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { X } from 'lucide-react';

interface PhotoGalleryProps {
  photos: PhotoRef[];
  onRemovePhoto?: (photoId: string) => void;
  onPhotoTap?: (index: number) => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onRemovePhoto,
  onPhotoTap
}) => {
  if (!photos || photos.length === 0) return null;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          className="relative aspect-square rounded-lg border border-border overflow-hidden bg-muted group"
        >
          {/* Main image clickable to zoom */}
          <div
            onClick={() => onPhotoTap?.(index)}
            className="w-full h-full cursor-zoom-in"
          >
            <ImageWithFallback
              src={photo.thumbnailURL || photo.downloadURL}
              alt="Preview thumbnail"
              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
            />
          </div>

          {/* Remove button overlay */}
          {onRemovePhoto && (
            <button
              type="button"
              onClick={() => onRemovePhoto(photo.id)}
              className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600/90 text-white rounded-full transition shadow-sm cursor-pointer border border-white/20"
              title="Remove photo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
