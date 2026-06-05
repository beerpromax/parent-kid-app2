import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useProfile } from '../../context/ProfileContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { ProgressToReward } from '../../components/ProgressToReward';
import { StreakBadge } from '../../components/StreakBadge';
import { Star, Trophy, History, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { LedgerEntry } from '../../../lib/types';

export const TokenWallet: React.FC = () => {
  const { currentProfile } = useProfile();
  const { ledger, loading } = useData();
  const [filter, setFilter] = useState<'all' | 'earned' | 'spent'>('all');

  if (!currentProfile) return null;

  // Filter ledger based on selected tab
  const filteredLedger = ledger.filter((entry) => {
    if (filter === 'earned') {
      return entry.delta > 0;
    }
    if (filter === 'spent') {
      return entry.delta < 0;
    }
    return true;
  });

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'activity_approved':
        return 'Task Approved';
      case 'streak_bonus':
        return 'Streak Milestone Bonus! 🎉';
      case 'reward_redeemed':
        return 'Reward Redeemed';
      case 'reward_refunded':
        return 'Redemption Refunded';
      default:
        return 'Tokens Adjustment';
    }
  };

  const formatDate = (epochMs: number) => {
    return new Date(epochMs).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold text-foreground">My Wallet</h2>
        <p className="text-sm text-muted-foreground">Manage your tokens, check your streak, and see your transaction ledger</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Token Balance Card */}
        <Card className="bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground shadow-lg flex flex-col justify-between min-h-[160px] rounded-xl border-none">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-primary-foreground/80 text-[10px] font-black uppercase tracking-wider">
                My Token Balance
              </p>
              <h3 className="text-4xl font-black">
                {currentProfile.tokenBalance}
              </h3>
            </div>
            <div className="bg-white/20 p-2.5 rounded-full shadow-inner shrink-0">
              <Star className="w-7 h-7 text-primary-foreground" fill="currentColor" />
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-1 text-[10px] text-primary-foreground/90 font-bold uppercase">
              <Trophy className="w-3.5 h-3.5" />
              <span>Keep earning!</span>
            </div>
            <StreakBadge
              currentStreak={currentProfile.currentStreak || 0}
              longestStreak={currentProfile.longestStreak || 0}
              className="bg-white/10 text-white hover:bg-white/25 text-xs font-extrabold border-none"
              showLongest={false}
            />
          </div>
        </Card>

        {/* Goal Progress Card */}
        <div className="md:col-span-2">
          <ProgressToReward />
        </div>
      </div>

      {/* Ledger History Card */}
      <Card className="bg-card border border-border shadow-sm rounded-xl">
        <CardHeader className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <span>Transaction Ledger</span>
          </CardTitle>

          <Tabs
            value={filter}
            onValueChange={(val) => setFilter(val as any)}
            className="w-full sm:w-auto"
          >
            <TabsList className="bg-muted p-0.5 rounded-md border border-border/10 grid grid-cols-3 w-full sm:w-[240px]">
              <TabsTrigger value="all" className="text-xs font-semibold py-1 rounded">All</TabsTrigger>
              <TabsTrigger value="earned" className="text-xs font-semibold py-1 rounded">Earned</TabsTrigger>
              <TabsTrigger value="spent" className="text-xs font-semibold py-1 rounded">Spent</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pb-5">
          {loading ? (
            <div className="space-y-3 py-6 animate-pulse">
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          ) : filteredLedger.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground italic">No transactions found for this filter. 🐾</p>
            </div>
          ) : (
            <ScrollArea className="h-full max-h-[360px] pr-2">
              <div className="space-y-1">
                {filteredLedger.map((entry, idx) => {
                  const isEarn = entry.delta > 0;
                  return (
                    <div key={entry.id}>
                      <div className="flex items-center justify-between py-3 px-1 hover:bg-muted/30 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${isEarn ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' : 'bg-red-500/10 text-red-600 dark:text-red-500'}`}>
                            {isEarn ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-extrabold text-foreground text-sm">
                              {getReasonLabel(entry.reason)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatDate(entry.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`font-black text-sm px-2.5 py-0.5 rounded-full ${
                            isEarn
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
                              : 'bg-red-500/10 text-red-600 dark:text-red-500'
                          }`}>
                            {isEarn ? '+' : ''}{entry.delta}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-bold">
                            Balance: {entry.balanceAfter}
                          </span>
                        </div>
                      </div>
                      {idx < filteredLedger.length - 1 && <Separator className="bg-border/30" />}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default TokenWallet;
