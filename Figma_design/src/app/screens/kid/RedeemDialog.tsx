import React, { useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { redeemReward } from '../../../lib/repos/redemptions.repo';
import { Reward } from '../../../lib/types';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { TokenChip } from '../../components/TokenChip';

interface RedeemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reward: Reward | null;
}

export const RedeemDialog: React.FC<RedeemDialogProps> = ({
  isOpen,
  onClose,
  reward,
}) => {
  const { familyId, currentProfile } = useProfile();
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!reward || !currentProfile) return null;

  const handleRedeem = async () => {
    setIsSubmitting(true);
    try {
      await redeemReward(familyId, {
        rewardId: reward.id,
        kidId: currentProfile.id,
        note,
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff8b3d', '#ffd6a5', '#ffb88c'],
      });

      toast.success(`Redeemed "${reward.title}"! Waiting for Parent to fulfill.`);
      setNote('');
      onClose();
    } catch (err: any) {
      console.error('Error redeeming reward:', err);
      if (err.message === 'INSUFFICIENT_TOKENS') {
        toast.error("You don't have enough tokens for this reward!");
      } else {
        toast.error('Failed to redeem reward');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Redeem Reward</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <h3 className="font-bold text-foreground text-base">{reward.title}</h3>
            {reward.description && (
              <p className="text-xs text-muted-foreground">{reward.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-semibold">Cost:</span>
              <TokenChip amount={reward.tokenCost} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="redeem-note" className="text-foreground text-sm font-semibold">
              Add a note for Parent (optional)
            </Label>
            <Textarea
              id="redeem-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., I'd like to do the movie night this Friday!"
              className="bg-input-background"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleRedeem}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {isSubmitting ? 'Redeeming...' : 'Confirm & Redeem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
