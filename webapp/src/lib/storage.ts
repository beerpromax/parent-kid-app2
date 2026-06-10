import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { photoStoragePath } from './paths';
import { PhotoRef } from './types';
import { resizeAndCompress, makeThumbnail } from './images';
import { photosEnabled } from './config';

const useLocalStorage = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true';

// --- IndexedDB Fallback for Local Storage Mode ---
const dbPromise = typeof window !== 'undefined' ? new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('FamilyAppStorage', 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore('photos');
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
}) : Promise.resolve(null as any);

async function savePhotoToIndexedDB(path: string, blob: Blob): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('photos', 'readwrite');
    const store = transaction.objectStore('photos');
    const request = store.put(blob, path);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getPhotoUrlFromIndexedDB(path: string): Promise<string> {
  const db = await dbPromise;
  if (!db) return '';
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('photos', 'readonly');
    const store = transaction.objectStore('photos');
    const request = store.get(path);
    request.onsuccess = () => {
      if (request.result instanceof Blob) {
        resolve(URL.createObjectURL(request.result));
      } else {
        resolve('');
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function deletePhotoFromIndexedDB(path: string): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('photos', 'readwrite');
    const store = transaction.objectStore('photos');
    const request = store.delete(path);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Global registry of created object URLs to revoke them when no longer needed
const createdUrls = new Set<string>();
function createSafeObjectURL(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  createdUrls.add(url);
  return url;
}

export function revokeAllLocalUrls(): void {
  createdUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Failed to revoke object URL', url, e);
    }
  });
  createdUrls.clear();
}

export async function resolveLocalPhotoRefs(photos: PhotoRef[]): Promise<PhotoRef[]> {
  if (!useLocalStorage) {
    return photos;
  }
  return Promise.all(
    photos.map(async (photo) => {
      let downloadURL = photo.downloadURL;
      if (downloadURL.startsWith('localdb://')) {
        const path = downloadURL.replace('localdb://', '');
        const blobUrl = await getPhotoUrlFromIndexedDB(path);
        if (blobUrl) downloadURL = blobUrl;
      }
      let thumbnailURL = photo.thumbnailURL;
      if (thumbnailURL && thumbnailURL.startsWith('localdb://')) {
        const path = thumbnailURL.replace('localdb://', '');
        const blobUrl = await getPhotoUrlFromIndexedDB(path);
        if (blobUrl) thumbnailURL = blobUrl;
      }
      return {
        ...photo,
        downloadURL,
        thumbnailURL,
      };
    })
  );
}

export async function uploadEntryPhoto(
  familyId: string,
  kidId: string,
  entryId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<PhotoRef> {
  if (!photosEnabled) {
    // Firebase Storage is deferred until the project is on the Blaze plan;
    // the uploader UI is hidden, this guard is defense in depth.
    throw new Error('PHOTOS_DISABLED');
  }

  // 1. Validate size and type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error('Unsupported image format. Allowed formats: JPEG, PNG, WEBP, HEIC.');
  }
  const maxBytes = 15 * 1024 * 1024; // 15MB
  if (file.size > maxBytes) {
    throw new Error('Image is too large. Max size is 15MB.');
  }

  // 2. Compress and generate thumbnail
  onProgress?.(10);
  const fullBlob = await resizeAndCompress(file, 1600, 0.82);
  onProgress?.(30);
  const thumbBlob = await makeThumbnail(file, 320);
  onProgress?.(50);

  const photoId = `photo_${Math.random().toString(36).substr(2, 9)}`;
  const fullStoragePath = photoStoragePath(familyId, kidId, entryId, photoId, 'full');
  const thumbStoragePath = photoStoragePath(familyId, kidId, entryId, photoId, 'thumb');

  if (useLocalStorage) {
    // Save to IndexedDB
    try {
      await savePhotoToIndexedDB(fullStoragePath, fullBlob);
      await savePhotoToIndexedDB(thumbStoragePath, thumbBlob);
      onProgress?.(100);

      // Return paths with virtual schema prefix 'localdb://'
      return {
        id: photoId,
        storagePath: fullStoragePath,
        downloadURL: `localdb://${fullStoragePath}`,
        thumbnailURL: `localdb://${thumbStoragePath}`,
        sizeBytes: fullBlob.size,
        uploadedAt: Date.now(),
      };
    } catch (e: any) {
      // Clean up on failure
      await deletePhotoFromIndexedDB(fullStoragePath);
      await deletePhotoFromIndexedDB(thumbStoragePath);
      throw new Error(`Failed to save image locally: ${e.message}`);
    }
  }

  // Live Firebase Storage Upload
  const fullRef = ref(storage, fullStoragePath);
  const thumbRef = ref(storage, thumbStoragePath);

  // Helper for upload with progress reporting
  const uploadTask = (storageRef: any, blob: Blob, startPct: number, endPct: number) => {
    return new Promise<string>((resolve, reject) => {
      const upload = uploadBytesResumable(storageRef, blob, { contentType: 'image/jpeg' });
      upload.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          const currentPct = Math.round(startPct + (progress * (endPct - startPct)) / 100);
          onProgress?.(currentPct);
        },
        (error) => reject(error),
        async () => {
          try {
            const url = await getDownloadURL(upload.snapshot.ref);
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  };

  try {
    // Upload full image (50% to 80%)
    const downloadURL = await uploadTask(fullRef, fullBlob, 50, 80);
    // Upload thumbnail (80% to 100%)
    const thumbnailURL = await uploadTask(thumbRef, thumbBlob, 80, 100);

    return {
      id: photoId,
      storagePath: fullStoragePath,
      downloadURL,
      thumbnailURL,
      sizeBytes: fullBlob.size,
      uploadedAt: Date.now(),
    };
  } catch (e: any) {
    // Cleanup orphans on failure
    try {
      await deleteObject(fullRef);
    } catch {}
    try {
      await deleteObject(thumbRef);
    } catch {}
    throw new Error(`Failed to upload photo to Firebase Storage: ${e.message}`);
  }
}

export async function deleteEntryPhoto(photo: PhotoRef): Promise<void> {
  const fullStoragePath = photo.storagePath;
  const thumbStoragePath = fullStoragePath.replace(/\.jpg$/, '_thumb.jpg');

  if (useLocalStorage) {
    await deletePhotoFromIndexedDB(fullStoragePath);
    await deletePhotoFromIndexedDB(thumbStoragePath);
    return;
  }

  const fullRef = ref(storage, fullStoragePath);
  const thumbRef = ref(storage, thumbStoragePath);

  try {
    await deleteObject(fullRef);
  } catch (e) {
    console.warn(`Could not delete full storage object (may have been deleted): ${fullStoragePath}`, e);
  }

  try {
    await deleteObject(thumbRef);
  } catch (e) {
    console.warn(`Could not delete thumb storage object (may have been deleted): ${thumbStoragePath}`, e);
  }
}
