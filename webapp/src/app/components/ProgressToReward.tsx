import React from 'react';
import { useData } from '../context/DataContext';
import { useProfile } from '../context/ProfileContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Gift, Sparkles, CheckCircle2 } from 'lucide-react';
import { TokenChip } from './TokenChip';

export const ProgressToReward: React.FC = () => {
  const { rewards } = useData();
  const { currentProfile } = useProfile();

  if (!currentProfile) return null;

  // Filter rewards: active (including negotiating) and assigned to this kid
  const activeRewards = rewards.filter(
    (r) =>
      (r.status === 'active' || r.status === 'negotiating') &&
      (r.forKidIds.length === 0 || r.forKidIds.includes(currentProfile.id))
  );

  // Sort by token cost ascending
  const sortedRewards = [...activeRewards].sort((a, b) => a.tokenCost - b.tokenCost);

  // Find nearest goal: cheapest reward whose cost > current balance
  const nextGoal = sortedRewards.find((r) => r.tokenCost > currentProfile.tokenBalance);

  let content = null;

  if (activeRewards.length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
        <Gift className="w-10 h-10 text-muted-foreground/50" />
        <p className="text-sm font-semibold text-muted-foreground">No rewards available yet</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Ask your parents to add rewards or propose one yourself!
        </p>
      </div>
    );
  } else if (!nextGoal) {
    // All rewards are affordable!
    const cheapest = sortedRewards[0];
    content = (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h4 className="font-bold text-foreground text-sm">All rewards reachable!</h4>
          </div>
          <Sparkles className="w-5 h-5 text-amber-500 animate-bounce" />
        </div>
        <p className="text-xs text-muted-foreground">
          You have enough tokens to buy any reward in the catalog! Go ahead and redeem one!
        </p>
        <Progress value={100} className="h-3 bg-secondary [&>div]:bg-emerald-500 rounded-full" />
      </div>
    );
  } else {
    // We have a next goal!
    const pct = Math.min(100, Math.max(0, (currentProfile.tokenBalance / nextGoal.tokenCost) * 100));
    const remaining = nextGoal.tokenCost - currentProfile.tokenBalance;

    content = (
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 pr-4">
            <span className="text-[10px] uppercase font-black text-primary tracking-wider">
              Next Goal
            </span>
            <h4 className="font-extrabold text-foreground text-base leading-snug line-clamp-1">
              {nextGoal.title}
            </h4>
            <p className="text-xs text-muted-foreground">
              Need <span className="font-bold text-foreground">{remaining}</span> more tokens
            </p>
          </div>
          <TokenChip amount={nextGoal.tokenCost} size="sm" />
        </div>

        <div className="space-y-1.5">
          <Progress value={pct} className="h-3 bg-secondary rounded-full [&>div]:bg-primary" />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold">
            <span>{currentProfile.tokenBalance} / {nextGoal.tokenCost} tokens</span>
            <span>{Math.round(pct)}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-card border border-border shadow-sm">
      <CardHeader className="py-4 pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Gift className="w-4 h-4 text-primary" />
          <span>Goal Progress</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        {content}
      </CardContent>
    </Card>
  );
};
