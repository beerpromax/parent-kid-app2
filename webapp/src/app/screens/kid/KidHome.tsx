import React, { useState, useEffect, useRef } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { useData } from '../../context/DataContext';
import { ActivityList } from './ActivityList';
import { TokenWallet } from './TokenWallet';
import { Wishlist } from './Wishlist';
import { MyNegotiations } from './MyNegotiations';
import { MyJourney } from './MyJourney';
import { NotificationBadge } from '../../components/NotificationBadge';
import { StreakBadge } from '../../components/StreakBadge';
import { Sparkles, CheckSquare, Wallet, Gift, MessageSquare, BookOpen } from 'lucide-react';
import { SessionButton } from '../../components/SessionButton';
import { ProfileBadge } from '../../components/ProfileBadge';
import { TokenChip } from '../../components/TokenChip';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { Completion } from '../../../lib/types';

export const KidHome: React.FC = () => {
  const { currentProfile } = useProfile();
  const { completions, negotiations } = useData();
  const [activeTab, setActiveTab] = useState<'activities' | 'wallet' | 'wishlist' | 'negotiations' | 'journey'>('activities');
  const prevCompletionsRef = useRef<Completion[]>([]);

  useEffect(() => {
    const prevCompletions = prevCompletionsRef.current;
    if (prevCompletions.length > 0 && currentProfile) {
      completions.forEach((current) => {
        const prev = prevCompletions.find((c) => c.id === current.id);
        if (prev && prev.status === 'pending' && current.status === 'approved') {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ff8b3d', '#ffd6a5', '#ffb88c'],
          });
          toast.success(`🎉 Approved! +${current.tokenValueSnapshot} tokens!`);
        }
      });
    }
    prevCompletionsRef.current = completions;
  }, [completions, currentProfile]);

  if (!currentProfile) return null;

  // Calculate pending kid negotiation count (awaiting kid's response)
  const pendingNegotiationsCount = negotiations.filter(
    (t) =>
      t.initiatedByProfileId === currentProfile.id &&
      t.status === 'open' &&
      t.currentOfferByProfileId !== currentProfile.id
  ).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-card/95 backdrop-blur-md px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold text-foreground sm:text-xl">Kid Zone</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {currentProfile && (
              <>
                <StreakBadge
                  currentStreak={currentProfile.currentStreak || 0}
                  longestStreak={currentProfile.longestStreak || 0}
                  className="bg-orange-500/10 text-orange-500 text-xs font-bold shrink-0"
                />
                <ProfileBadge profile={currentProfile} avatarSize="sm" />
                <TokenChip amount={currentProfile.tokenBalance} size="sm" />
              </>
            )}
            <SessionButton />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border mb-8 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('activities')}
            className={`flex items-center gap-2 pb-4 px-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'activities'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            My Activities
          </button>
          
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex items-center gap-2 pb-4 px-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'wallet'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wallet className="w-4 h-4" />
            My Wallet
          </button>

          <button
            onClick={() => setActiveTab('wishlist')}
            className={`flex items-center gap-2 pb-4 px-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'wishlist'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Gift className="w-4 h-4" />
            Rewards
          </button>

          <button
            onClick={() => setActiveTab('negotiations')}
            className={`flex items-center gap-2 pb-4 px-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer relative ${
              activeTab === 'negotiations'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Negotiations</span>
            <NotificationBadge count={pendingNegotiationsCount} className="ml-1" />
          </button>

          <button
            onClick={() => setActiveTab('journey')}
            className={`flex items-center gap-2 pb-4 px-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer relative ${
              activeTab === 'journey'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>My Journey</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in duration-200">
          {activeTab === 'activities' && <ActivityList />}
          {activeTab === 'wallet' && <TokenWallet />}
          {activeTab === 'wishlist' && <Wishlist />}
          {activeTab === 'negotiations' && <MyNegotiations />}
          {activeTab === 'journey' && <MyJourney />}
        </div>
      </main>
    </div>
  );
};
