import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useProfile } from '../../context/ProfileContext';
import { approveCompletion, rejectCompletion } from '../../../lib/repos/completions.repo';
import { ProfileBadge } from '../../components/ProfileBadge';
import { TokenChip } from '../../components/TokenChip';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Inbox, Check, X, MessageSquare, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';

export const ApprovalInbox: React.FC = () => {
  const { completions, loading } = useData();
  const { familyId, profiles, currentProfile } = useProfile();
  const [inFlightIds, setInFlightIds] = useState<string[]>([]);

  const pendingCompletions = completions.filter((c) => c.status === 'pending');

  const handleApprove = async (id: string, kidId: string, value: number) => {
    if (!currentProfile) return;
    setInFlightIds((prev) => [...prev, id]);
    try {
      await approveCompletion(familyId, id, currentProfile.id);
      const kid = profiles.find((p) => p.id === kidId);
      toast.success(`Approved! +${value} tokens to ${kid?.name || 'kid'}`);
    } catch (err) {
      console.error('Error approving completion:', err);
      toast.error('Failed to approve completion');
    } finally {
      setInFlightIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleReject = async (id: string) => {
    if (!currentProfile) return;

    setInFlightIds((prev) => [...prev, id]);
    try {
      await rejectCompletion(familyId, id, currentProfile.id);
      toast.success('Submission rejected');
    } catch (err) {
      console.error('Error rejecting completion:', err);
      toast.error('Failed to reject completion');
    } finally {
      setInFlightIds((prev) => prev.filter((x) => x !== id));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Pending Approvals</h2>
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="border border-border rounded-xl p-5 space-y-3 bg-card animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-6 w-32 bg-muted rounded"></div>
                <div className="h-6 w-12 bg-muted rounded"></div>
              </div>
              <div className="h-4 w-48 bg-muted rounded"></div>
              <div className="h-8 w-full bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold text-foreground">Pending Approvals</h2>
        <p className="text-sm text-muted-foreground">Review completions submitted by kids</p>
      </div>

      {pendingCompletions.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No pending approvals 🎉"
          description="Everything is caught up! You will see new submissions here in real time."
        />
      ) : (
        <div className="grid gap-4">
          {pendingCompletions.map((completion) => {
            const kid = profiles.find((p) => p.id === completion.kidId);
            const formattedTime = new Date(completion.submittedAt).toLocaleString();
            const isInFlight = inFlightIds.includes(completion.id);

            return (
              <Card key={completion.id} className="bg-card border border-border shadow-sm overflow-hidden flex flex-col md:flex-row justify-between md:items-center p-5 gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between md:justify-start gap-4">
                    {kid && <ProfileBadge profile={kid} avatarSize="sm" />}
                    <TokenChip amount={completion.tokenValueSnapshot} size="sm" />
                  </div>
                  
                  <div>
                    <h3 className="text-base font-bold text-foreground leading-snug">
                      {completion.activityTitleSnapshot}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Submitted: {formattedTime}</span>
                    </div>
                  </div>

                  {completion.note && (
                    <div className="flex items-start gap-2 bg-muted/60 p-3 rounded-lg border border-border/40 mt-2 max-w-xl">
                      <MessageSquare className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground leading-relaxed italic">
                        "{completion.note}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 md:self-center">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isInFlight}
                        className="flex-1 md:flex-initial text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive font-semibold cursor-pointer flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground">Reject Completion?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to reject this completion? The kid will be able to try again and resubmit.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleReject(completion.id)}
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
                        >
                          Reject
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button
                    onClick={() => handleApprove(completion.id, completion.kidId, completion.tokenValueSnapshot)}
                    disabled={isInFlight}
                    className="flex-1 md:flex-initial bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    {isInFlight ? 'Approving...' : 'Approve'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
