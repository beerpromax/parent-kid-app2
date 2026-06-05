import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useProfile } from '../../context/ProfileContext';
import { fulfillRedemption, refundRedemption } from '../../../lib/repos/redemptions.repo';
import { EmptyState } from '../../components/EmptyState';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Gift, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { ProfileBadge } from '../../components/ProfileBadge';
import { TokenChip } from '../../components/TokenChip';
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

export const FulfillmentInbox: React.FC = () => {
  const { redemptions, loading } = useData();
  const { familyId, profiles, currentProfile } = useProfile();
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  if (!currentProfile) return null;

  // Filter requested redemptions across all kids
  const pendingRedemptions = redemptions.filter((r) => r.status === 'requested');

  const getKidProfile = (kidId: string) => {
    return profiles.find((p) => p.id === kidId);
  };

  const handleFulfill = async (id: string, title: string) => {
    setSubmittingId(id);
    try {
      await fulfillRedemption(familyId, id, currentProfile.id);
      toast.success(`Marked "${title}" as fulfilled!`);
    } catch (err) {
      console.error('Error fulfilling redemption:', err);
      toast.error('Failed to fulfill reward');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRefund = async (id: string, title: string) => {
    setSubmittingId(id);
    try {
      await refundRedemption(familyId, id, currentProfile.id);
      toast.success(`Refunded tokens for "${title}"!`);
    } catch (err) {
      console.error('Error refunding redemption:', err);
      toast.error('Failed to refund reward');
    } finally {
      setSubmittingId(null);
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
        <h2 className="text-xl font-bold text-foreground">Fulfillment Queue</h2>
        <p className="text-sm text-muted-foreground">Review and fulfill reward redemption requests from kids</p>
      </div>

      {pendingRedemptions.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="Fulfillment queue is empty"
          description="Kids haven't redeemed any rewards recently. Check back later!"
        />
      ) : (
        <div className="space-y-4">
          {pendingRedemptions.map((red) => {
            const kid = getKidProfile(red.kidId);
            const isDisabled = submittingId !== null;

            return (
              <Card key={red.id} className="border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 pb-3 gap-4">
                  <div className="flex items-start gap-3">
                    {kid && (
                      <div className="shrink-0 mt-0.5">
                        <ProfileBadge profile={kid} avatarSize="md" showName={false} />
                      </div>
                    )}
                    <div className="space-y-1">
                      <CardTitle className="text-base font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-primary">{kid?.name || 'Kid'}</span>
                        <span className="text-muted-foreground font-normal">wants to redeem</span>
                        <span className="underline decoration-primary/40 decoration-2 font-black">{red.rewardTitleSnapshot}</span>
                      </CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <TokenChip amount={red.tokenCostSnapshot} size="sm" />
                        <span>•</span>
                        <span>Requested {formatDate(red.requestedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Refund Dialog */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isDisabled}
                          className="h-9 text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center gap-1 cursor-pointer font-semibold"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Refund Tokens
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-foreground flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            <span>Refund Redemption?</span>
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to refund "{red.rewardTitleSnapshot}"? This will return{' '}
                            <span className="font-bold text-foreground">{red.tokenCostSnapshot} tokens</span> back to{' '}
                            {kid?.name || 'the kid'}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRefund(red.id, red.rewardTitleSnapshot)}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer font-semibold"
                          >
                            Yes, Refund
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button
                      size="sm"
                      disabled={isDisabled}
                      onClick={() => handleFulfill(red.id, red.rewardTitleSnapshot)}
                      className="h-9 bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Mark Fulfilled
                    </Button>
                  </div>
                </CardHeader>

                {red.note && (
                  <CardContent className="px-5 pb-5 pt-0 mt-1">
                    <div className="bg-muted/40 p-2.5 rounded-lg border border-border/10 text-xs text-muted-foreground">
                      <span className="font-bold text-foreground block mb-0.5">Note from {kid?.name || 'Kid'}:</span>
                      <p className="italic">"{red.note}"</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
