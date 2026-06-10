import React, { useRef, useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import { uploadEntryPhoto } from '../../lib/storage';
import { PhotoRef } from '../../lib/types';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Camera, Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface PhotoUploaderProps {
  entryId: string;
  kidId: string;
  currentPhotosCount: number;
  onPhotoUploadComplete: (photo: PhotoRef) => void;
  disabled?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  entryId,
  kidId,
  currentPhotosCount,
  onPhotoUploadComplete,
  disabled = false
}) => {
  const { familyId } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<Record<string, { name: string; progress: number }>>({});

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    handleFiles(e.target.files);
  };

  const triggerPicker = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    const activeUploadsCount = Object.keys(uploads).length;
    if (currentPhotosCount + activeUploadsCount + files.length > 8) {
      toast.error('Maximum photo limit reached: You can attach at most 8 photos per entry.');
      return;
    }

    // Process each upload sequentially or in parallel
    for (const file of files) {
      const uploadId = `${file.name}_${Math.random().toString(36).substr(2, 5)}`;
      setUploads((prev) => ({
        ...prev,
        [uploadId]: { name: file.name, progress: 0 }
      }));

      try {
        const photoRef = await uploadEntryPhoto(
          familyId,
          kidId,
          entryId,
          file,
          (progress) => {
            setUploads((prev) => {
              if (!prev[uploadId]) return prev;
              return {
                ...prev,
                [uploadId]: { ...prev[uploadId], progress }
              };
            });
          }
        );
        onPhotoUploadComplete(photoRef);
      } catch (err: any) {
        toast.error(`Upload failed for ${file.name}: ${err.message}`);
      } finally {
        setUploads((prev) => {
          const copy = { ...prev };
          delete copy[uploadId];
          return copy;
        });
      }
    }

    // Reset input value so same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const activeUploads = Object.values(uploads);

  return (
    <div className="space-y-4">
      {/* Upload Drag Target Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerPicker}
        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all duration-200 ${
          disabled ? 'opacity-50 cursor-not-allowed border-border bg-muted/20' : ''
        } ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border bg-card hover:bg-muted/30 hover:border-muted-foreground/40'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="hidden"
          disabled={disabled || currentPhotosCount >= 8}
        />
        
        <div className="bg-primary/10 text-primary p-3 rounded-full">
          <Upload className="w-5 h-5" />
        </div>
        
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">
            {currentPhotosCount >= 8 ? 'Photo limit reached' : 'Upload photos'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px]">
            {currentPhotosCount >= 8 
              ? 'Maximum 8 photos are already attached.' 
              : 'Drag and drop or click to browse. Max 15MB.'}
          </p>
        </div>
      </div>

      {/* Upload progress bars list */}
      {activeUploads.length > 0 && (
        <div className="space-y-2.5 bg-muted/40 border border-border/60 p-3.5 rounded-lg">
          <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            Uploading image files...
          </h5>
          <div className="space-y-2">
            {activeUploads.map((up, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                  <span className="truncate max-w-[200px]">{up.name}</span>
                  <span className="font-semibold">{up.progress}%</span>
                </div>
                <Progress value={up.progress} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
