import React, { useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { submitCompletion } from '../../../lib/repos/completions.repo';
import { Activity } from '../../../lib/types';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';

interface SubmitCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
}

export const SubmitCompletionDialog: React.FC<SubmitCompletionDialogProps> = ({
  isOpen,
  onClose,
  activity,
}) => {
  const { familyId, currentProfile } = useProfile();
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!activity || !currentProfile) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitCompletion(familyId, {
        activityId: activity.id,
        kidId: currentProfile.id,
        note,
      });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ff8b3d', '#ffd6a5', '#ffb88c'],
      });

      toast.success(`Submitted "${activity.title}" for approval!`);
      setNote('');
      onClose();
    } catch (err: any) {
      console.error('Error submitting completion:', err);
      if (err.message === 'PENDING_COMPLETION_EXISTS') {
        toast.error('You already have a pending submission for this activity!');
      } else {
        toast.error('Failed to submit completion');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Submit Completion</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-1">
            <h3 className="font-bold text-foreground text-base">{activity.title}</h3>
            {activity.description && (
              <p className="text-xs text-muted-foreground">{activity.description}</p>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="note" className="text-foreground text-sm font-semibold">
              Add a note (optional)
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., I cleaned under the bed and put away all toys!"
              className="bg-input-background"
            />
          </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {isSubmitting ? 'Submitting...' : 'Submit to Parent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
