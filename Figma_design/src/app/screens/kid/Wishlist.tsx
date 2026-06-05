import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useProfile } from '../../context/ProfileContext';
import { RewardCard } from '../../components/RewardCard';
import { RedeemDialog } from './RedeemDialog';
import { NegotiationLauncher } from './NegotiationLauncher';
import { proposeReward } from '../../../lib/repos/rewards.repo';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Gift, Sparkles, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Reward } from '../../../lib/types';

export const Wishlist: React.FC = () => {
  const { rewards, loading } = useData();
  const { familyId, currentProfile } = useProfile();

  // Selected reward for redemption
  const [selectedRedeemReward, setSelectedRedeemReward] = useState<Reward | null>(null);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);

  // Selected reward for negotiation
  const [selectedNegReward, setSelectedNegReward] = useState<Reward | null>(null);
  const [negDialogOpen, setNegDialogOpen] = useState(false);

  // Proposal modal state
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposedTitle, setProposedTitle] = useState('');
  const [proposedDesc, setProposedDesc] = useState('');
  const [isProposing, setIsProposing] = useState(false);

  if (!currentProfile) return null;

  // Filter rewards:
  // 1. Available rewards (status = 'active' or status = 'negotiating')
  // We exclude rewards that are archived or proposed.
  // And must be assigned to ALL or to this kid
  const activeRewards = rewards.filter(
    (r) =>
      (r.status === 'active' || r.status === 'negotiating') &&
      (r.forKidIds.length === 0 || r.forKidIds.includes(currentProfile.id))
  );

  // 2. Kid's own proposals (proposed/rejected/active proposed by this kid)
  const myProposals = rewards.filter(
    (r) => r.proposedByProfileId === currentProfile.id
  );

  const handleOpenRedeem = (reward: Reward) => {
    setSelectedRedeemReward(reward);
    setRedeemDialogOpen(true);
  };

  const handleOpenNeg = (reward: Reward) => {
    setSelectedNegReward(reward);
    setNegDialogOpen(true);
  };

  const handlePropose = async () => {
    if (!proposedTitle.trim()) {
      toast.error('Please enter a title for your reward proposal!');
      return;
    }
    setIsProposing(true);
    try {
      await proposeReward(familyId, {
        title: proposedTitle,
        description: proposedDesc,
        proposedByProfileId: currentProfile.id,
        forKidIds: [currentProfile.id], // default scope to self
      });
      toast.success(`Proposed reward "${proposedTitle}"! Waiting for Parent to review.`);
      setProposedTitle('');
      setProposedDesc('');
      setProposalOpen(false);
    } catch (err) {
      console.error('Error proposing reward:', err);
      toast.error('Failed to propose reward');
    } finally {
      setIsProposing(false);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Rewards Catalog</h2>
          <p className="text-sm text-muted-foreground">Spend your earned tokens to redeem rewards, or propose new ones!</p>
        </div>
        <Button
          onClick={() => setProposalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 cursor-pointer shadow-md self-start sm:self-center"
        >
          <Sparkles className="w-4 h-4" />
          Propose a Reward
        </Button>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="bg-muted p-1 rounded-lg border border-border/20 mb-4 inline-flex">
          <TabsTrigger value="catalog" className="text-xs sm:text-sm font-semibold rounded-md px-4 py-2">
            Available Rewards
          </TabsTrigger>
          <TabsTrigger value="proposals" className="text-xs sm:text-sm font-semibold rounded-md px-4 py-2">
            My Proposals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          {activeRewards.length === 0 ? (
            <EmptyState
              icon={Gift}
              title="No rewards available"
              description="There are no rewards available to redeem right now. Propose one to your parents!"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeRewards.map((reward) => {
                const canRedeem = currentProfile.tokenBalance >= reward.tokenCost;
                
                const actions = (
                  <div className="flex items-center gap-2 w-full">
                    {reward.status === 'negotiating' ? (
                      <span className="text-xs font-semibold bg-blue-500/15 text-blue-500 px-2.5 py-1 rounded-md shrink-0">
                        Negotiating
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenNeg(reward)}
                        className="text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Negotiate Cost
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      onClick={() => handleOpenRedeem(reward)}
                      disabled={!canRedeem}
                      className={`font-bold text-xs flex-1 cursor-pointer ${
                        canRedeem
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                      }`}
                    >
                      {canRedeem ? 'Redeem' : 'Need More Tokens'}
                    </Button>
                  </div>
                );

                return (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    actions={actions}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="proposals" className="space-y-4">
          {myProposals.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No proposals yet"
              description="You haven't proposed any custom rewards yet. Suggest something fun!"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myProposals.map((reward) => {
                let statusText = 'Review Pending';
                let statusClass = 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500';

                if (reward.status === 'active' || reward.status === 'negotiating') {
                  statusText = `Approved (${reward.tokenCost} tokens)`;
                  statusClass = 'bg-green-500/10 text-green-600 dark:text-green-500';
                } else if (reward.status === 'archived') {
                  statusText = 'Rejected / Archived';
                  statusClass = 'bg-red-500/10 text-red-600 dark:text-red-500';
                }

                const badge = (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${statusClass}`}>
                    {statusText}
                  </span>
                );

                return (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    statusBadge={badge}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Propose Reward Dialog */}
      <Dialog open={proposalOpen} onOpenChange={(open) => !open && setProposalOpen(false)}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Propose New Reward</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="prop-title" className="text-foreground text-sm font-semibold">
                Reward Name
              </Label>
              <Input
                id="prop-title"
                placeholder="e.g., Friday night pizza party!"
                value={proposedTitle}
                onChange={(e) => setProposedTitle(e.target.value)}
                className="bg-input-background"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="prop-desc" className="text-foreground text-sm font-semibold">
                Details (optional)
              </Label>
              <Textarea
                id="prop-desc"
                placeholder="Describe the reward so parent knows what you're proposing..."
                value={proposedDesc}
                onChange={(e) => setProposedDesc(e.target.value)}
                className="bg-input-background"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setProposalOpen(false)} disabled={isProposing}>
              Cancel
            </Button>
            <Button
              onClick={handlePropose}
              disabled={isProposing}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isProposing ? 'Submitting...' : 'Submit Proposal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redeem Confirmation Dialog */}
      <RedeemDialog
        isOpen={redeemDialogOpen}
        onClose={() => {
          setRedeemDialogOpen(false);
          setSelectedRedeemReward(null);
        }}
        reward={selectedRedeemReward}
      />

      {/* Negotiation Launcher Dialog */}
      <NegotiationLauncher
        isOpen={negDialogOpen}
        onClose={() => {
          setNegDialogOpen(false);
          setSelectedNegReward(null);
        }}
        targetType="reward"
        targetId={selectedNegReward?.id || ''}
        targetTitle={selectedNegReward?.title || ''}
        currentValue={selectedNegReward?.tokenCost || 0}
      />
    </div>
  );
};
