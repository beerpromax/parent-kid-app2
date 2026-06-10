import React from 'react';
import { useProfile } from '../context/ProfileContext';
import { Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';

export const ProfilePicker: React.FC = () => {
  const { profiles, selectProfile, loading } = useProfile();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground font-medium">Loading family profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl bg-card border border-border shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="text-center pt-8 pb-4">
          <div className="flex justify-center mb-3">
            <div className="bg-primary/10 p-3 rounded-full text-primary">
              <Sparkles className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">
            Welcome to Family Rewards!
          </CardTitle>
          <CardDescription className="text-sm sm:text-base text-muted-foreground mt-2">
            Select your profile to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 sm:px-12 pb-12">
          <div className="grid gap-6 sm:grid-cols-3 mt-6">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => selectProfile(profile.id)}
                className="flex flex-col items-center p-6 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/40 hover:shadow-md transition-all duration-200 group cursor-pointer text-center"
              >
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-3xl sm:text-4xl shadow-md border-4 border-white group-hover:scale-105 transition-transform duration-200"
                  style={{ backgroundColor: profile.color || '#ff8b3d' }}
                >
                  {profile.emoji || (profile.role === 'parent' ? '👑' : '👧')}
                </div>
                <span className="mt-4 font-bold text-foreground text-base group-hover:text-primary transition-colors">
                  {profile.name}
                </span>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full bg-muted">
                  {profile.role}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
