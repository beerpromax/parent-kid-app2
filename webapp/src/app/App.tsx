import { AppProviders } from './providers/AppProviders';
import { useAuth } from './context/AuthContext';
import { useProfile } from './context/ProfileContext';
import { useData } from './context/DataContext';
import { AuthGate } from './screens/AuthGate';
import { ProfilePicker } from './screens/ProfilePicker';
import { ParentHome } from './screens/parent/ParentHome';
import { KidHome } from './screens/kid/KidHome';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { useLocalStorage } from '../lib/config';
import { signOutUser } from '../lib/auth/onboarding';

function AppContent() {
  const { firebaseUser, mapping, authLoading } = useAuth();
  const { currentProfile, loading } = useProfile();
  const { loading: dataLoading } = useData();

  if (authLoading || loading || (currentProfile && dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground font-medium">Loading Family Coordination Hub...</p>
        </div>
      </div>
    );
  }

  if (!useLocalStorage) {
    if (!firebaseUser) {
      return <AuthGate />;
    }
    if (!mapping || !currentProfile) {
      // Orphaned auth account (no users/{uid} mapping or missing profile) —
      // shouldn't happen via the normal flows; offer a way back out.
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <p className="text-sm text-muted-foreground">
              This account isn’t linked to a family. Sign out and join with an
              invite code, or create a new family.
            </p>
            <Button onClick={() => signOutUser()}>Sign out</Button>
          </div>
        </div>
      );
    }
  }

  if (!currentProfile) {
    return <ProfilePicker />;
  }

  if (currentProfile.role === 'parent') {
    return <ParentHome />;
  }

  return <KidHome />;
}

export default function App() {
  return (
    <AppProviders>
      <AppContent />
      <Toaster position="top-center" />
    </AppProviders>
  );
}
