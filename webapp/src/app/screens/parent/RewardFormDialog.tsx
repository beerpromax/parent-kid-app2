import React, { useState, useEffect } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { createReward, updateReward } from '../../../lib/repos/rewards.repo';
import { Reward } from '../../../lib/types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { ProfileBadge } from '../../components/ProfileBadge';

interface RewardFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rewardToEdit?: Reward;
}

export const RewardFormDialog: React.FC<RewardFormDialogProps> = ({
  isOpen,
  onClose,
  rewardToEdit,
}) => {
  const { familyId, profiles, currentProfile } = useProfile();
  const kids = profiles.filter((p) => p.role === 'kid');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tokenCost, setTokenCost] = useState<string>('');
  const [forKidIds, setForKidIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (rewardToEdit) {
      setTitle(rewardToEdit.title);
      setDescription(rewardToEdit.description || '');
      setTokenCost(rewardToEdit.tokenCost.toString());
      setForKidIds(rewardToEdit.forKidIds);
    } else {
      setTitle('');
      setDescription('');
      setTokenCost('');
      setForKidIds([]);
    }
  }, [rewardToEdit, isOpen]);

  const toggleKidAssignment = (kidId: string) => {
    setForKidIds((prev) =>
      prev.includes(kidId) ? prev.filter((id) => id !== kidId) : [...prev, kidId]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    const cost = parseInt(tokenCost, 10);
    if (isNaN(cost) || cost < 1) {
      toast.error('Token cost must be a number of 1 or more');
      return;
    }

    if (!currentProfile) return;

    setIsSubmitting(true);
    try {
      if (rewardToEdit) {
        await updateReward(familyId, rewardToEdit.id, {
          title,
          description,
          tokenCost: cost,
          forKidIds,
        });
        toast.success('Reward updated successfully');
      } else {
        await createReward(familyId, {
          title,
          description,
          tokenCost: cost,
          forKidIds,
          createdByProfileId: currentProfile.id,
        });
        toast.success('Reward created successfully');
      }
      onClose();
    } catch (err) {
      console.error('Error saving reward:', err);
      toast.error('Failed to save reward');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {rewardToEdit ? 'Edit Reward' : 'Create New Reward'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="rew-title" className="text-foreground text-sm font-semibold">Title *</Label>
            <Input
              id="rew-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Ice Cream Night"
              className="bg-input-background"
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="rew-description" className="text-foreground text-sm font-semibold">Description</Label>
            <Textarea
              id="rew-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., A special trip to the local ice cream shop for a double scoop!"
              className="bg-input-background"
            />
          </div>

          {/* Token Cost */}
          <div className="grid gap-2">
            <Label htmlFor="rew-cost" className="text-foreground text-sm font-semibold">Token Cost *</Label>
            <Input
              id="rew-cost"
              type="number"
              min="1"
              value={tokenCost}
              onChange={(e) => setTokenCost(e.target.value)}
              placeholder="e.g., 20"
              className="bg-input-background"
            />
          </div>

          {/* Assign Kids */}
          <div className="grid gap-2">
            <Label className="text-foreground text-sm font-semibold">Available for Kids</Label>
            <span className="text-xs text-muted-foreground">Select kids who can redeem this, or leave empty for all</span>
            <div className="flex flex-col gap-2 mt-1">
              {kids.map((kid) => {
                const isChecked = forKidIds.includes(kid.id);
                return (
                  <div
                    key={kid.id}
                    onClick={() => toggleKidAssignment(kid.id)}
                    className="flex items-center justify-between p-2 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <ProfileBadge profile={kid} avatarSize="sm" />
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleKidAssignment(kid.id)}
                      className="border-primary"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isSubmitting ? 'Saving...' : 'Save Reward'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
