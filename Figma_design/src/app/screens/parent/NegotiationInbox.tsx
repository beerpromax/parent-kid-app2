import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useProfile } from '../../context/ProfileContext';
import { NegotiationThreadView } from '../../components/NegotiationThreadView';
import { EmptyState } from '../../components/EmptyState';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { MessageSquare, ArrowRight, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ProfileBadge } from '../../components/ProfileBadge';
import { NegotiationThread } from '../../../lib/types';

export const NegotiationInbox: React.FC = () => {
  const { negotiations, loading } = useData();
  const { currentProfile, profiles } = useProfile();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  if (!currentProfile) return null;

  // Filter open negotiations needing parent or other open ones
  // We want to list all open threads first, then closed threads
  const openThreads = negotiations.filter((t) => t.status === 'open');
  const closedThreads = negotiations.filter((t) => t.status !== 'open');

  // Sorted: open first, then by updatedAt descending
  const sortedThreads = [...openThreads, ...closedThreads].sort((a, b) => {
    if (a.status === 'open' && b.status !== 'open') return -1;
    if (b.status === 'open' && a.status !== 'open') return 1;
    return b.updatedAt - a.updatedAt;
  });

  const selectedThread = sortedThreads.find((t) => t.id === selectedThreadId);

  const getKidProfile = (kidId: string) => {
    return profiles.find((p) => p.id === kidId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-500 text-white font-semibold uppercase text-[9px] px-2 py-0.5 border-none">Open</Badge>;
      case 'agreed':
        return <Badge className="bg-green-600 text-white font-semibold uppercase text-[9px] px-2 py-0.5 border-none">Agreed</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 text-white font-semibold uppercase text-[9px] px-2 py-0.5 border-none">Rejected</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-500 text-white font-semibold uppercase text-[9px] px-2 py-0.5 border-none">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (epochMs: number) => {
    return new Date(epochMs).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((n) => (
          <div key={n} className="h-24 bg-muted animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Negotiation Queue</h2>
        <p className="text-sm text-muted-foreground">Review rate requests and chat about activity values or reward costs</p>
      </div>

      {sortedThreads.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Negotiation queue is empty"
          description="Kids haven't started any negotiations recently."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-3 items-start">
          {/* Thread list */}
          <div className={`md:col-span-1 space-y-3 ${selectedThreadId ? 'hidden md:block' : 'block'}`}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
              All Threads ({sortedThreads.length})
            </h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {sortedThreads.map((thread) => {
                const isSelected = thread.id === selectedThreadId;
                const kid = getKidProfile(thread.initiatedByProfileId);
                const isActionNeeded = thread.status === 'open' && thread.currentOfferByProfileId !== currentProfile.id;

                return (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer relative ${
                      isSelected
                        ? 'bg-primary/5 border-primary/50 shadow-sm'
                        : 'bg-card border-border hover:bg-muted/50'
                    }`}
                  >
                    {isActionNeeded && (
                      <span className="absolute top-3 right-3 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-foreground text-sm line-clamp-1 leading-snug">
                          {thread.targetTitleSnapshot}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          {kid && <ProfileBadge profile={kid} avatarSize="sm" showName={true} className="text-xs text-muted-foreground" />}
                        </div>
                        <span>{getStatusBadge(thread.status)}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 font-medium">
                        <span>
                          {thread.targetType === 'activity' ? 'Task Value' : 'Reward Cost'}:{' '}
                          <span className="font-bold text-foreground">{thread.currentOfferValue}</span>
                        </span>
                        <span>{formatDate(thread.updatedAt)}</span>
                      </div>

                      {isActionNeeded && (
                        <div className="text-[10px] font-bold text-primary mt-1">
                          Awaiting your reply!
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details Pane */}
          <div className={`md:col-span-2 ${!selectedThreadId ? 'hidden md:flex md:items-center md:justify-center md:h-[400px] md:border md:border-dashed md:border-border md:rounded-xl md:bg-muted/10' : 'block'}`}>
            {selectedThread ? (
              <div className="space-y-4">
                {/* Back button for mobile */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedThreadId(null)}
                  className="md:hidden flex items-center gap-1 cursor-pointer mb-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to List
                </Button>
                <NegotiationThreadView thread={selectedThread} />
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground italic py-12">
                Select a negotiation thread from the list to view details and respond.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default NegotiationInbox;
