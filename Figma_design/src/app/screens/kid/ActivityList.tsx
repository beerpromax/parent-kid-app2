import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useProfile } from '../../context/ProfileContext';
import { ActivityCard } from '../../components/ActivityCard';
import { CompletionStatusBadge } from '../../components/CompletionStatusBadge';
import { SubmitCompletionDialog } from './SubmitCompletionDialog';
import { NegotiationLauncher } from './NegotiationLauncher';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/ui/button';
import { ClipboardList, Check, MessageSquare } from 'lucide-react';
import { Activity } from '../../../lib/types';

export const ActivityList: React.FC = () => {
  const { activities, completions, loading } = useData();
  const { currentProfile } = useProfile();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [negDialogOpen, setNegDialogOpen] = useState(false);
  const [activityToNeg, setActivityToNeg] = useState<Activity | null>(null);

  if (!currentProfile) return null;

  const kidActivities = activities.filter(
    (act) => act.assignedKidIds.length === 0 || act.assignedKidIds.includes(currentProfile.id)
  );

  const getLatestCompletion = (activityId: string) => {
    const actCompletions = completions.filter((c) => c.activityId === activityId);
    if (actCompletions.length === 0) return null;
    return actCompletions[0]; // Already sorted descending by submittedAt in repository
  };

  const handleOpenDialog = (activity: Activity) => {
    setSelectedActivity(activity);
    setDialogOpen(true);
  };

  const handleOpenNeg = (activity: Activity) => {
    setActivityToNeg(activity);
    setNegDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="border border-border rounded-xl p-5 space-y-4 bg-card animate-pulse">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-6 w-32 bg-muted rounded"></div>
                <div className="h-4 w-16 bg-muted rounded"></div>
              </div>
              <div className="h-6 w-12 bg-muted rounded-full"></div>
            </div>
            <div className="h-12 w-full bg-muted rounded"></div>
            <div className="h-8 w-24 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Available Activities</h2>
        <p className="text-sm text-muted-foreground">Complete tasks assigned to you to earn tokens!</p>
      </div>

      {kidActivities.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No activities assigned"
          description="You don't have any activities assigned to you right now. Check back later!"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kidActivities.map((activity) => {
            const latestComp = getLatestCompletion(activity.id);
            const status = latestComp?.status;

            let statusBadge = null;
            let actionBtn = (
              <Button
                onClick={() => handleOpenDialog(activity)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 cursor-pointer w-full"
              >
                <Check className="w-4 h-4" />
                Mark Complete
              </Button>
            );

            if (status === 'pending') {
              statusBadge = <CompletionStatusBadge status="pending" />;
              actionBtn = (
                <Button
                  disabled
                  className="bg-muted text-muted-foreground font-semibold cursor-not-allowed w-full"
                >
                  Pending Review
                </Button>
              );
            } else if (status === 'rejected') {
              statusBadge = <CompletionStatusBadge status="rejected" />;
              actionBtn = (
                <Button
                  onClick={() => handleOpenDialog(activity)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 cursor-pointer w-full"
                >
                  <Check className="w-4 h-4" />
                  Try Again
                </Button>
              );
            }

            const actions = (
              <div className="flex items-center gap-2 w-full">
                {activity.status !== 'negotiating' && !latestComp && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenNeg(activity)}
                    className="text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Negotiate
                  </Button>
                )}
                <div className="flex-1">
                  {actionBtn}
                </div>
              </div>
            );

            return (
              <ActivityCard
                key={activity.id}
                activity={activity}
                statusBadge={statusBadge}
                actions={actions}
              />
            );
          })}
        </div>
      )}

      <SubmitCompletionDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        activity={selectedActivity}
      />

      <NegotiationLauncher
        isOpen={negDialogOpen}
        onClose={() => {
          setNegDialogOpen(false);
          setActivityToNeg(null);
        }}
        targetType="activity"
        targetId={activityToNeg?.id || ''}
        targetTitle={activityToNeg?.title || ''}
        currentValue={activityToNeg?.tokenValue || 0}
      />
    </div>
  );
};
