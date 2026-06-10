import React, { useState } from 'react';
import { Sparkles, LogIn, Home, Ticket } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { signUpParent, claimInvite, signInFlexible } from '../../lib/auth/onboarding';
import { useAuth } from '../context/AuthContext';

function friendlyError(err: unknown, context: 'login' | 'signup' | 'claim'): string {
  const code = (err as { code?: string })?.code || '';
  const message = (err as { message?: string })?.message || '';

  if (code === 'auth/email-already-in-use') {
    return context === 'claim'
      ? 'That username is taken — try another one.'
      : 'That email is already registered. Try logging in instead.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Wrong email/username or password.';
  }
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
  if (code === 'auth/invalid-email') return 'That email address doesn’t look valid.';
  if (code === 'auth/too-many-requests') return 'Too many attempts — wait a moment and try again.';
  if (message.includes('INVALID_USERNAME')) return 'Username must be 3–20 characters: letters, numbers, or _.';
  if (message.includes('INVITE_NOT_FOUND')) return 'That invite code doesn’t exist. Check for typos.';
  if (message.includes('INVITE_NOT_PENDING')) return 'That invite code was already used or revoked.';
  if (message.includes('INVITE_EXPIRED')) return 'That invite code has expired — ask your parent for a new one.';
  console.error('Auth error:', err);
  return 'Something went wrong. Please try again.';
}

export const AuthGate: React.FC = () => {
  const { refreshMapping } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // login
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  // signup
  const [familyName, setFamilyName] = useState('');
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  // claim
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [claimPassword, setClaimPassword] = useState('');

  async function run(action: () => Promise<void>, context: 'login' | 'signup' | 'claim') {
    setBusy(true);
    setError('');
    try {
      await action();
      await refreshMapping();
    } catch (err) {
      setError(friendlyError(err, context));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card border border-border shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="text-center pt-8 pb-2">
          <div className="flex justify-center mb-3">
            <div className="bg-primary/10 p-3 rounded-full text-primary">
              <Sparkles className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">
            Family Rewards
          </CardTitle>
          <CardDescription className="text-sm sm:text-base text-muted-foreground mt-2">
            Earn tokens together, grow together
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 sm:px-8 pb-8">
          <Tabs defaultValue="login" onValueChange={() => setError('')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login" className="gap-1"><LogIn className="w-3.5 h-3.5" /> Log in</TabsTrigger>
              <TabsTrigger value="signup" className="gap-1"><Home className="w-3.5 h-3.5" /> New family</TabsTrigger>
              <TabsTrigger value="claim" className="gap-1"><Ticket className="w-3.5 h-3.5" /> Invite code</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form
                className="space-y-4 mt-4"
                onSubmit={(e) => { e.preventDefault(); run(() => signInFlexible({ identifier, password: loginPassword }), 'login'); }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="login-id">Email or kid username</Label>
                  <Input id="login-id" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-pw">Password</Label>
                  <Input id="login-pw" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} autoComplete="current-password" required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? 'Logging in…' : 'Log in'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form
                className="space-y-4 mt-4"
                onSubmit={(e) => { e.preventDefault(); run(() => signUpParent({ email, password: signupPassword, parentName, familyName }), 'signup'); }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="su-family">Family name</Label>
                  <Input id="su-family" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="The Smiths" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-name">Your name</Label>
                  <Input id="su-name" value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Mom / Dad" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-pw">Password</Label>
                  <Input id="su-pw" type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? 'Creating family…' : 'Create family'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  You’ll be the parent account. Kids join later with invite codes.
                </p>
              </form>
            </TabsContent>

            <TabsContent value="claim">
              <form
                className="space-y-4 mt-4"
                onSubmit={(e) => { e.preventDefault(); run(() => claimInvite({ code, username, password: claimPassword }), 'claim'); }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="cl-code">Invite code</Label>
                  <Input id="cl-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD2345" className="font-mono tracking-widest" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cl-user">Pick a username</Label>
                  <Input id="cl-user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="mia_2017" autoComplete="username" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cl-pw">Pick a password</Label>
                  <Input id="cl-pw" type="password" value={claimPassword} onChange={(e) => setClaimPassword(e.target.value)} autoComplete="new-password" minLength={6} required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? 'Joining…' : 'Join my family'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Ask your parent for an invite code from the Family tab.
                </p>
              </form>
            </TabsContent>
          </Tabs>

          {error && (
            <p className="mt-4 text-sm text-destructive text-center font-medium" role="alert">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
