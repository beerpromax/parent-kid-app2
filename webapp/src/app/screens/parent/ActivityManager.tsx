import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useProfile } from '../../context/ProfileContext';
import { archiveActivity } from '../../../lib/repos/activities.repo';
import { ActivityCard } from '../../components/ActivityCard';
import { ActivityFormDialog } from './ActivityFormDialog';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/ui/button';
import { Plus, ClipboardList, Trash2, Edit2 } from 'lucide-react';
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

export const ActivityManager: React.FC = () => {
  const { activities, loading } = useData();
  const { familyId } = useProfile();
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(undefined);

  const handleEdit = (activity: any) => {
    setEditingActivity(activity);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingActivity(undefined);
    setFormOpen(true);
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveActivity(familyId, id);
      toast.success('Activity archived successfully');
    } catch (err) {
      console.error('Error archiving activity:', err);
      toast.error('Failed to archive activity');
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
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground">Activities</h2>
          <p className="text-sm text-muted-foreground">Create and manage tasks for kids to complete</p>
        </div>
        <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 cursor-pointer">
          <Plus className="w-4 h-4" />
          Add Activity
        </Button>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No activities yet"
          description="Create your first family activity to get started!"
          actionText="Create Activity"
          onAction={handleCreate}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              actions={
                <div className="flex items-center gap-1.5 ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(activity)}
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
                        <AlertDialogTitle className="text-foreground">Archive Activity?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove "{activity.title}" from circulation. Kids won't see it anymore.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleArchive(activity.id)}
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
                        >
                          Archive
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              }
            />
          ))}
        </div>
      )}

      <ActivityFormDialog
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        activityToEdit={editingActivity}
      />
    </div>
  );
};
