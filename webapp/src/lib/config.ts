// Central runtime flags (read from Vite env).

export const useLocalStorage = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true';

// Photos require Firebase Storage, which is deferred until the project is on the
// Blaze plan. The localStorage demo mode keeps photos (no Storage involved).
export const photosEnabled = useLocalStorage || import.meta.env.VITE_ENABLE_PHOTOS === 'true';
