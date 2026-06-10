import React, { useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { ActivityManager } from './ActivityManager';
import { ApprovalInbox } from './ApprovalInbox';
import { RewardManager } from './RewardManager';
import { FulfillmentInbox } from './FulfillmentInbox';
import { NegotiationInbox } from './NegotiationInbox';
import { FamilyDashboard } from './FamilyDashboard';
import { GrowthLog } from './GrowthLog';
import { Sparkles, CheckSquare, Inbox, Users, Gift, ShoppingBag, MessageSquare, BookOpen } from 'lucide-react';
import { ProfileBadge } from '../../components/ProfileBadge';
import { SessionButton } from '../../components/SessionButton';
import { NotificationBadge } from '../../components/NotificationBadge';
import { useData } from '../../context/DataContext';

export const ParentHome: React.FC = () => {
  const { currentProfile } = useProfile();
  const { completions, rewards, redemptions, negotiations } = useData();
  const [activeTab, setActiveTab] = useState<'activities' | 'approvals' | 'rewards' | 'fulfillment' | 'negotiations' | 'dashboard' | 'journey'>('activities');

  if (!currentProfile) return null;

  const pendingCount = completions.filter((c) => c.status === 'pending').length;
  const proposedRewardsCount = rewards.filter((r) => r.status === 'proposed').length;
  const requestedRedemptionsCount = redemptions.filter((r) => r.status === 'requested').length;
  
  // Open negotiations where kid made the last offer (standing offer is not parent's)
  const pendingNegotiationsCount = negotiations.filter(
    (t) => t.status === 'open' && t.currentOfferByProfileId !== currentProfile.id
  ).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-card/95 backdrop-blur-md px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold text-foreground sm:text-xl">Family Portal</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {currentProfile && (
              <ProfileBadge profile={currentProfile} avatarSize="sm" />
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
            Activities
          </button>
          
          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex items-center gap-2 pb-4 px-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap relative cursor-pointer ${
              activeTab === 'approvals'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Approvals</span>
            <NotificationBadge count={pendingCount} className="ml-1" />
          </button>

          <button
            onClick={() => setActiveTab('rewards')}
            className={`flex items-center gap-2 pb-4 px-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap relative cursor-pointer ${
              activeTab === 'rewards'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Rewards</span>
            <NotificationBadge count={proposedRewardsCount} className="ml-1" />
          </button>

          <button
            onClick={() => setActiveTab('fulfillment')}
            className={`flex items-center gap-2 pb-4 px-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap relative cursor-pointer ${
              activeTab === 'fulfillment'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Fulfillments</span>
            <NotificationBadge count={requestedRedemptionsCount} className="ml-1" />
          </button>

          <button
            onClick={() => setActiveTab('negotiations')}
            className={`flex items-center gap-2 pb-4 px-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap relative cursor-pointer ${
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
            className={`flex items-center gap-2 pb-4 px-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'journey'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Journey
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 pb-4 px-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            Dashboard
          </button>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in duration-200">
          {activeTab === 'activities' && <ActivityManager />}
          {activeTab === 'approvals' && <ApprovalInbox />}
          {activeTab === 'rewards' && <RewardManager />}
          {activeTab === 'fulfillment' && <FulfillmentInbox />}
          {activeTab === 'negotiations' && <NegotiationInbox />}
          {activeTab === 'journey' && <GrowthLog />}
          {activeTab === 'dashboard' && <FamilyDashboard />}
        </div>
      </main>
    </div>
  );
};
