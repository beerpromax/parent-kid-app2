import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useProfile } from '../../context/ProfileContext';
import { setRewardCostAndActivate, rejectProposal, archiveReward } from '../../../lib/repos/rewards.repo';
import { RewardCard } from '../../components/RewardCard';
import { RewardFormDialog } from './RewardFormDialog';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Gift, Check, X, Edit2, Trash2 } from 'lucide-react';
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
import { Reward } from '../../../lib/types';

export const RewardManager: React.FC = () => {
  const { rewards, loading } = useData();
  const { familyId, profiles } = useProfile();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | undefined>(undefined);

  // Activation dialog state for proposals
  const [activateOpen, setActivateOpen] = useState(false);
  const [proposedReward, setProposedReward] = useState<Reward | null>(null);
  const [tokenCost, setTokenCost] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  // Group rewards:
  // 1. Proposed rewards
  const proposedRewards = rewards.filter((r) => r.status === 'proposed');
  // 2. Active rewards (active or negotiating)
  const activeRewards = rewards.filter((r) => r.status === 'active' || r.status === 'negotiating');

  const getProposerName = (profileId: string) => {
    const prof = profiles.find((p) => p.id === profileId);
    return prof ? prof.name : 'Unknown';
  };

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingReward(undefined);
    setFormOpen(true);
  };

  const handleOpenActivate = (reward: Reward) => {
    setProposedReward(reward);
    setTokenCost('');
    setActivateOpen(true);
  };

  const handleActivateSubmit = async () => {
    const cost = parseInt(tokenCost, 10);
    if (isNaN(cost) || cost < 1) {
      toast.error('Token cost must be at least 1');
      return;
    }
    if (!proposedReward) return;

    setIsActivating(true);
    try {
      await setRewardCostAndActivate(familyId, proposedReward.id, cost);
      toast.success(`Activated "${proposedReward.title}" with a cost of ${cost} tokens!`);
      setActivateOpen(false);
      setProposedReward(null);
    } catch (err) {
      console.error('Error activating reward:', err);
      toast.error('Failed to activate reward');
    } finally {
      setIsActivating(false);
    }
  };

  const handleReject = async (id: string, title: string) => {
    try {
      await rejectProposal(familyId, id);
      toast.success(`Rejected proposal "${title}"`);
    } catch (err) {
      console.error('Error rejecting proposal:', err);
      toast.error('Failed to reject proposal');
    }
  };

  const handleArchive = async (id: string, title: string) => {
    try {
      await archiveReward(familyId, id);
      toast.success(`Archived reward "${title}"`);
    } catch (err) {
      console.error('Error archiving reward:', err);
      toast.error('Failed to archive reward');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
          <div className="h-10 w-36 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="border border-border rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-6 w-32 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
                </div>
                <div className="h-6 w-12 bg-muted animate-pulse rounded-full"></div>
              </div>
              <div className="h-12 w-full bg-muted animate-pulse rounded"></div>
              <div className="h-6 w-24 bg-muted animate-pulse rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground">Rewards Manager</h2>
          <p className="text-sm text-muted-foreground">Manage rewards catalog and review kid suggestions</p>
        </div>
        <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 cursor-pointer shadow-md">
          <Plus className="w-4 h-4" />
          Add Reward
        </Button>
      </div>

      {/* Proposals Queue */}
      {proposedRewards.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-yellow-500 shrink-0" />
              Proposals to Review
            </h3>
            <p className="text-xs text-muted-foreground">Kids proposed these rewards. Set their token cost to activate them.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proposedRewards.map((reward) => {
              const proposer = getProposerName(reward.proposedByProfileId);
              const actions = (
                <div className="flex items-center gap-2 ml-auto w-full justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground">Reject Proposal?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to reject "{reward.title}" proposed by {proposer}? This will archive it.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleReject(reward.id, reward.title)}
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
                        >
                          Reject
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button
                    size="sm"
                    onClick={() => handleOpenActivate(reward)}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Approve & Set Cost
                  </Button>
                </div>
              );

              return (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  statusBadge={
                    <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-md">
                      Proposed by {proposer}
                    </span>
                  }
                  actions={actions}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Active Catalog */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Active Reward Catalog</h3>
          <p className="text-xs text-muted-foreground">These rewards are active and can be redeemed by kids.</p>
        </div>

        {activeRewards.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No rewards in catalog"
            description="Create your first active reward or approve a kid proposal to build the catalog!"
            actionText="Add Reward"
            onAction={handleCreate}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeRewards.map((reward) => {
              const isNegotiating = reward.status === 'negotiating';
              
              const actions = (
                <div className="flex items-center gap-1.5 ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(reward)}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Archive
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground">Archive Reward?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove "{reward.title}" from the catalog. Kids won't be able to redeem it anymore.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleArchive(reward.id, reward.title)}
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
                        >
                          Archive
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );

              return (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  statusBadge={
                    isNegotiating ? (
                      <span className="text-xs font-semibold bg-blue-500/15 text-blue-500 px-2 py-0.5 rounded-md">
                        Negotiating
                      </span>
                    ) : undefined
                  }
                  actions={actions}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Set Cost & Activate Dialog */}
      <Dialog open={activateOpen} onOpenChange={(open) => !open && setActivateOpen(false)}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Activate Proposed Reward</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <h3 className="font-bold text-foreground text-sm">{proposedReward?.title}</h3>
              {proposedReward?.description && (
                <p className="text-xs text-muted-foreground">{proposedReward.description}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="activate-cost" className="text-foreground text-sm font-semibold">
                Set Token Cost
              </Label>
              <Input
                id="activate-cost"
                type="number"
                min="1"
                placeholder="e.g. 15"
                value={tokenCost}
                onChange={(e) => setTokenCost(e.target.value)}
                className="bg-input-background"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setActivateOpen(false)} disabled={isActivating}>
              Cancel
            </Button>
            <Button
              onClick={handleActivateSubmit}
              disabled={isActivating}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isActivating ? 'Activating...' : 'Approve & Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Form Dialog */}
      <RewardFormDialog
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        rewardToEdit={editingReward}
      />
    </div>
  );
};
