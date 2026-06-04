import React, { useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { ActivityManager } from './ActivityManager';
import { ApprovalInbox } from './ApprovalInbox';
import { FamilyDashboard } from './FamilyDashboard';
import { Sparkles, LogOut, CheckSquare, Inbox, Users } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ProfileBadge } from '../../components/ProfileBadge';
import { useData } from '../../context/DataContext';

export const ParentHome: React.FC = () => {
  const { currentProfile, clearProfile } = useProfile();
  const { completions } = useData();
  const [activeTab, setActiveTab] = useState<'activities' | 'approvals' | 'dashboard'>('activities');

  const pendingCount = completions.filter((c) => c.status === 'pending').length;

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
            <Button
              variant="ghost"
              size="sm"
              onClick={clearProfile}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Switch Profile</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('activities')}
            className={`flex items-center gap-2 pb-4 px-4 font-semibold text-sm transition-all border-b border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'activities'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Manage Activities
          </button>
          
          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex items-center gap-2 pb-4 px-4 font-semibold text-sm transition-all border-b border-b-2 whitespace-nowrap relative cursor-pointer ${
              activeTab === 'approvals'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Approval Inbox
            {pendingCount > 0 && (
              <span className="absolute top-0.5 right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 pb-4 px-4 font-semibold text-sm transition-all border-b border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            Family Dashboard
          </button>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in duration-200">
          {activeTab === 'activities' && <ActivityManager />}
          {activeTab === 'approvals' && <ApprovalInbox />}
          {activeTab === 'dashboard' && <FamilyDashboard />}
        </div>
      </main>
    </div>
  );
};
