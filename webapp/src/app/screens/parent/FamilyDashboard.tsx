import React from 'react';
import { useData } from '../../context/DataContext';
import { useProfile } from '../../context/ProfileContext';
import { Card } from '../../components/ui/card';
import { ProfileBadge } from '../../components/ProfileBadge';
import { TokenChip } from '../../components/TokenChip';
import { EmptyState } from '../../components/EmptyState';
import { Users, CheckCircle } from 'lucide-react';

export const FamilyDashboard: React.FC = () => {
  const { profiles } = useProfile();
  const { completions, loading } = useData();

  const kids = profiles.filter((p) => p.role === 'kid');

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Family Dashboard</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((n) => (
            <Card key={n} className="bg-card border-border animate-pulse p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-10 w-32 bg-muted rounded"></div>
                <div className="h-8 w-16 bg-muted rounded-full"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-muted rounded"></div>
                <div className="h-4 w-3/4 bg-muted rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold text-foreground">Family Dashboard</h2>
        <p className="text-sm text-muted-foreground">Overview of kids' token balances and activity status</p>
      </div>

      {kids.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No kid profiles yet"
          description="Create a kid profile to start coordinating chores!"
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {kids.map((kid) => {
            const kidCompletions = completions.filter((c) => c.kidId === kid.id);
            const pendingCount = kidCompletions.filter((c) => c.status === 'pending').length;
            const approvedCompletions = kidCompletions
              .filter((c) => c.status === 'approved')
              .slice(0, 3); // last 3 approved

            return (
              <Card key={kid.id} className="bg-card border border-border shadow-sm overflow-hidden p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <ProfileBadge profile={kid} avatarSize="lg" />
                  <TokenChip amount={kid.tokenBalance} size="lg" />
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-b border-border/40 py-4">
                  <div className="text-center">
                    <span className="text-2xl font-extrabold text-foreground block">
                      {pendingCount}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Pending Approvals
                    </span>
                  </div>
                  
                  <div className="text-center border-l border-border/40">
                    <span className="text-2xl font-extrabold text-foreground block">
                      {kidCompletions.filter((c) => c.status === 'approved').length}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Tasks Completed
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                    <span>Recent Completed Chores</span>
                  </h3>
                  
                  {approvedCompletions.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic pl-1">
                      No activities completed yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {approvedCompletions.map((comp) => (
                        <div
                          key={comp.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/30"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {comp.activityTitleSnapshot}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(comp.reviewedAt || comp.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                            +{comp.tokenValueSnapshot} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
