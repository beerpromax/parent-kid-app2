import { AppProviders } from './providers/AppProviders';
import { useProfile } from './context/ProfileContext';
import { useData } from './context/DataContext';
import { ProfilePicker } from './screens/ProfilePicker';
import { ParentHome } from './screens/parent/ParentHome';
import { KidHome } from './screens/kid/KidHome';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const { currentProfile, loading } = useProfile();
  const { loading: dataLoading } = useData();

  if (loading || (currentProfile && dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground font-medium">Loading Family Coordination Hub...</p>
        </div>
      </div>
    );
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
