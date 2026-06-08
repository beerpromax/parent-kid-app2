import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Trash2, RotateCcw } from 'lucide-react';
import { GrowthLogEntry } from '../../lib/types';
import { useProfile } from '../context/ProfileContext';
import { subscribeAllGrowthLogs, restoreEntry } from '../../lib/repos/growthlog.repo';
import { toast } from 'sonner';

interface TrashBinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  kidId: string;
}

export const TrashBinDialog: React.FC<TrashBinDialogProps> = ({ isOpen, onClose, kidId }) => {
  const { familyId } = useProfile();
  const [trashed, setTrashed] = useState<GrowthLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId || !kidId) return;
    setLoading(true);
    const unsub = subscribeAllGrowthLogs(familyId, { kidId }, (all) => {
      const onlyTrashed = all.filter((e) => e.status === 'trashed');
      setTrashed(onlyTrashed);
      setLoading(false);
    });
    return unsub;
  }, [familyId, kidId]);

  const handleRestore = async (id: string) => {
    try {
      await restoreEntry(familyId, id);
      toast.success("Entry restored to timeline");
    } catch (err) {
      toast.error("Failed to restore entry");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full max-h-[80vh] flex flex-col justify-between overflow-hidden bg-card border border-border rounded-xl shadow-lg z-50 p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-1.5">
            <Trash2 className="w-5 h-5 text-muted-foreground" />
            Trash Bin
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            View recently deleted growth log entries. Restored entries will return to the timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-1">
          {loading ? (
            <div className="text-center text-xs text-muted-foreground py-8">Loading trash bin...</div>
          ) : trashed.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-8 italic">Trash bin is empty.</div>
          ) : (
            trashed.map((entry) => (
              <div key={entry.id} className="border border-border/85 p-3 rounded-lg flex justify-between items-center gap-3 bg-muted/20">
                <div className="space-y-0.5 truncate flex-1">
                  <h5 className="text-xs font-bold text-foreground truncate">{entry.title || 'Untitled Activity Log'}</h5>
                  <span className="text-[10px] text-muted-foreground">{entry.date}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRestore(entry.id)}
                  className="h-8 text-[10px] font-bold cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-border/60">
          <Button size="sm" variant="outline" onClick={onClose} className="text-xs font-semibold cursor-pointer">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
