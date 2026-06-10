import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { useProfile } from '../context/ProfileContext';
import { useLocalStorage } from '../../lib/config';
import { signOutUser } from '../../lib/auth/onboarding';

// Local mode: switches back to the profile picker.
// Live mode: signs the bound account out (identity can't be switched in-app).
export const SessionButton: React.FC = () => {
  const { clearProfile } = useProfile();

  const handleClick = () => {
    if (useLocalStorage) {
      clearProfile();
    } else {
      signOutUser().catch((err) => console.error('Sign out failed:', err));
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">{useLocalStorage ? 'Switch Profile' : 'Sign Out'}</span>
    </Button>
  );
};
