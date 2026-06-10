import React, { useState, useEffect } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { canInitiateNegotiation, initiateNegotiation } from '../../../lib/repos/negotiations.repo';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface NegotiationLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'activity' | 'reward';
  targetId: string;
  targetTitle: string;
  currentValue: number;
  onSuccess?: () => void;
}

export const NegotiationLauncher: React.FC<NegotiationLauncherProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  currentValue,
  onSuccess,
}) => {
  const { familyId, currentProfile } = useProfile();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [proposedValue, setProposedValue] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !familyId || !targetId) return;

    async function check() {
      setIsChecking(true);
      try {
        const res = await canInitiateNegotiation(familyId, targetType, targetId);
        setIsAllowed(res);
      } catch (err) {
        console.error('Error checking negotiation guard:', err);
        setIsAllowed(false);
      } finally {
        setIsChecking(false);
      }
    }
    check();
  }, [isOpen, familyId, targetType, targetId]);

  if (!currentProfile) return null;

  const handleSubmit = async () => {
    const val = parseInt(proposedValue, 10);
    if (isNaN(val) || val < 1) {
      toast.error('Please enter a valid number of tokens (at least 1)');
      return;
    }
    if (val === currentValue) {
      toast.error('The proposed value must be different from the current value!');
      return;
    }

    setIsSubmitting(true);
    try {
      await initiateNegotiation(familyId, {
        targetType,
        targetId,
        kidId: currentProfile.id,
        proposedValue: val,
        message,
      });

      toast.success(`Negotiation started for "${targetTitle}"!`);
      setProposedValue('');
      setMessage('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error initiating negotiation:', err);
      toast.error('Failed to start negotiation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Negotiate {targetType === 'activity' ? 'Activity Value' : 'Reward Cost'}
          </DialogTitle>
        </DialogHeader>

        {isChecking ? (
          <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
            Checking eligibility...
          </div>
        ) : !isAllowed ? (
          <div className="py-4 space-y-4">
            <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
              <AlertCircle className="h-4 h-4 text-destructive" />
              <AlertTitle>Negotiation Blocked</AlertTitle>
              <AlertDescription className="text-xs leading-relaxed mt-1">
                You cannot negotiate this item right now. This is usually because:
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li>It has a pending completion or redemption request</li>
                  <li>A negotiation is already active on this item</li>
                  <li>It is not currently active</li>
                </ul>
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={onClose} className="w-full">
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <h3 className="font-bold text-foreground text-sm">{targetTitle}</h3>
              <p className="text-xs text-muted-foreground">
                Current {targetType === 'activity' ? 'Value' : 'Cost'}:{' '}
                <span className="font-bold text-primary">{currentValue} tokens</span>
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="proposed-value" className="text-foreground text-sm font-semibold">
                Your Proposed {targetType === 'activity' ? 'Value' : 'Cost'} (tokens)
              </Label>
              <Input
                id="proposed-value"
                type="number"
                min="1"
                placeholder={`e.g. ${currentValue > 5 ? currentValue - 2 : currentValue + 2}`}
                value={proposedValue}
                onChange={(e) => setProposedValue(e.target.value)}
                className="bg-input-background"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="neg-message" className="text-foreground text-sm font-semibold">
                Why do you want to change it?
              </Label>
              <Textarea
                id="neg-message"
                placeholder="Write a message to your parent explaining why..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-input-background"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {isSubmitting ? 'Starting...' : 'Send Proposal'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
