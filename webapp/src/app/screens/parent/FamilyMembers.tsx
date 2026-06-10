import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { UserPlus, Ticket, Copy, XCircle, Link2, Link2Off } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { createProfile } from '../../../lib/repos/profiles.repo';
import { createInvite, subscribeInvites, revokeInvite } from '../../../lib/repos/invites.repo';
import { useLocalStorage } from '../../../lib/config';
import { Invite, Profile } from '../../../lib/types';

const KID_EMOJIS = ['👧', '👦', '🧒', '👶', '🐱', '🐶', '🦊', '🐼', '🦄', '🐯'];
const KID_COLORS = ['#ffb88c', '#ffd6a5', '#ffadad', '#caffbf', '#9bf6ff', '#bdb2ff'];

function AddKidDialog({ isOpen, onClose, familyId }: { isOpen: boolean; onClose: () => void; familyId: string }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(KID_EMOJIS[0]);
  const [color, setColor] = useState(KID_COLORS[0]);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setBusy(true);
    try {
      await createProfile(familyId, { name: name.trim(), role: 'kid', color, emoji });
      toast.success(`${name.trim()} added to the family`);
      setName('');
      onClose();
    } catch (err) {
      console.error('Failed to add kid:', err);
      toast.error('Could not add the kid profile');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a kid</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="kid-name">Name</Label>
            <Input id="kid-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mia" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Avatar</Label>
            <div className="flex flex-wrap gap-2">
              {KID_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-full text-xl flex items-center justify-center border transition-all cursor-pointer ${
                    emoji === e ? 'border-primary ring-2 ring-primary/40 bg-primary/10' : 'border-border bg-card hover:bg-muted/50'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {KID_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                    color === c ? 'border-primary ring-2 ring-primary/40' : 'border-border'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add kid'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const FamilyMembers: React.FC = () => {
  const { familyId, profiles } = useProfile();
  const { firebaseUser } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [showAddKid, setShowAddKid] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  useEffect(() => {
    if (useLocalStorage || !familyId) return;
    return subscribeInvites(familyId, setInvites);
  }, [familyId]);

  const pendingInvites = invites.filter((i) => i.status === 'pending' && i.expiresAt > Date.now());
  const pendingByProfile = new Map(pendingInvites.map((i) => [i.profileId, i]));
  const kids = profiles.filter((p) => p.role === 'kid');
  const parents = profiles.filter((p) => p.role === 'parent');

  const handleGenerateInvite = async (kid: Profile) => {
    if (!firebaseUser) return;
    setGeneratingFor(kid.id);
    try {
      const invite = await createInvite(familyId, kid.id, kid.name, firebaseUser.uid);
      toast.success(`Invite code for ${kid.name}: ${invite.id}`);
    } catch (err) {
      console.error('Failed to create invite:', err);
      toast.error('Could not create the invite');
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied');
    } catch {
      toast.error('Could not copy — select the code manually');
    }
  };

  const handleRevoke = async (invite: Invite) => {
    try {
      await revokeInvite(invite.id);
      toast.success('Invite revoked');
    } catch (err) {
      console.error('Failed to revoke invite:', err);
      toast.error('Could not revoke the invite');
    }
  };

  const memberRow = (profile: Profile) => {
    const pending = pendingByProfile.get(profile.id);
    const linked = !!profile.uid;
    return (
      <div key={profile.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: profile.color || '#ff8b3d' }}
        >
          {profile.emoji || (profile.role === 'parent' ? '👑' : '🧒')}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">{profile.name}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{profile.role}</p>
        </div>
        {useLocalStorage ? null : linked ? (
          <Badge variant="secondary" className="gap-1 text-green-700 bg-green-100">
            <Link2 className="w-3 h-3" /> Linked
          </Badge>
        ) : pending ? (
          <div className="flex items-center gap-1.5">
            <code className="px-2 py-1 rounded bg-muted font-mono text-sm tracking-widest">{pending.id}</code>
            <Button variant="ghost" size="sm" className="px-2" onClick={() => handleCopy(pending.id)} title="Copy code">
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="px-2 text-destructive" onClick={() => handleRevoke(pending)} title="Revoke invite">
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        ) : profile.role === 'kid' ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={generatingFor === profile.id}
            onClick={() => handleGenerateInvite(profile)}
          >
            <Ticket className="w-4 h-4" />
            {generatingFor === profile.id ? 'Generating…' : 'Invite'}
          </Button>
        ) : (
          <Badge variant="secondary" className="gap-1 text-muted-foreground">
            <Link2Off className="w-3 h-3" /> Not linked
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Family Members</CardTitle>
            <CardDescription className="mt-1.5">
              Add kids, then give them an invite code so they can log in on their own device.
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddKid(true)} className="gap-1.5 shrink-0">
            <UserPlus className="w-4 h-4" /> Add kid
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {parents.map(memberRow)}
          {kids.map(memberRow)}
          {kids.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No kids yet — add one to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {!useLocalStorage && pendingInvites.length > 0 && (
        <p className="text-xs text-muted-foreground px-1">
          Invite codes are single-use and expire after 7 days. The kid enters the
          code on the login screen under “Invite code”.
        </p>
      )}

      <AddKidDialog isOpen={showAddKid} onClose={() => setShowAddKid(false)} familyId={familyId} />
    </div>
  );
};
