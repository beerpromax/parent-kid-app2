import React, { useState, useEffect } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { createActivity, updateActivity } from '../../../lib/repos/activities.repo';
import { Activity } from '../../../lib/types';
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

interface ActivityFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activityToEdit?: Activity;
}

export const ActivityFormDialog: React.FC<ActivityFormDialogProps> = ({
  isOpen,
  onClose,
  activityToEdit,
}) => {
  const { familyId, profiles, currentProfile } = useProfile();
  const kids = profiles.filter((p) => p.role === 'kid');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [tokenValue, setTokenValue] = useState<string>('');
  const [assignedKidIds, setAssignedKidIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activityToEdit) {
      setTitle(activityToEdit.title);
      setDescription(activityToEdit.description || '');
      setDurationMinutes(activityToEdit.durationMinutes?.toString() || '');
      setTokenValue(activityToEdit.tokenValue.toString());
      setAssignedKidIds(activityToEdit.assignedKidIds);
    } else {
      setTitle('');
      setDescription('');
      setDurationMinutes('');
      setTokenValue('');
      setAssignedKidIds([]);
    }
  }, [activityToEdit, isOpen]);

  const toggleKidAssignment = (kidId: string) => {
    setAssignedKidIds((prev) =>
      prev.includes(kidId) ? prev.filter((id) => id !== kidId) : [...prev, kidId]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    const tokens = parseInt(tokenValue, 10);
    if (isNaN(tokens) || tokens < 1) {
      toast.error('Token reward must be a number of 1 or more');
      return;
    }

    const duration = durationMinutes ? parseInt(durationMinutes, 10) : undefined;
    if (duration !== undefined && (isNaN(duration) || duration < 0)) {
      toast.error('Duration must be 0 or more minutes');
      return;
    }

    if (!currentProfile) return;

    setIsSubmitting(true);
    try {
      if (activityToEdit) {
        await updateActivity(familyId, activityToEdit.id, {
          title,
          description,
          durationMinutes: duration,
          tokenValue: tokens,
          assignedKidIds,
        });
        toast.success('Activity updated successfully');
      } else {
        await createActivity(familyId, {
          title,
          description,
          durationMinutes: duration,
          tokenValue: tokens,
          assignedKidIds,
          createdByProfileId: currentProfile.id,
        });
        toast.success('Activity created successfully');
      }
      onClose();
    } catch (err) {
      console.error('Error saving activity:', err);
      toast.error('Failed to save activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {activityToEdit ? 'Edit Activity' : 'Create New Activity'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-foreground text-sm font-semibold">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Wash the dishes"
              className="bg-input-background"
            />
          </div>
          
          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description" className="text-foreground text-sm font-semibold">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Clear the table, load the dishwasher, and wipe counters"
              className="bg-input-background"
            />
          </div>
          
          {/* Duration & Tokens Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="duration" className="text-foreground text-sm font-semibold">Duration (mins)</Label>
              <Input
                id="duration"
                type="number"
                min="0"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="e.g., 15"
                className="bg-input-background"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="tokens" className="text-foreground text-sm font-semibold">Token Reward *</Label>
              <Input
                id="tokens"
                type="number"
                min="1"
                value={tokenValue}
                onChange={(e) => setTokenValue(e.target.value)}
                placeholder="e.g., 5"
                className="bg-input-background"
              />
            </div>
          </div>
          
          {/* Assign Kids */}
          <div className="grid gap-2">
            <Label className="text-foreground text-sm font-semibold">Assign to Kids</Label>
            <span className="text-xs text-muted-foreground">Select kids or leave empty for all kids</span>
            <div className="flex flex-col gap-2 mt-1">
              {kids.map((kid) => {
                const isChecked = assignedKidIds.includes(kid.id);
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
            {isSubmitting ? 'Saving...' : 'Save Activity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
