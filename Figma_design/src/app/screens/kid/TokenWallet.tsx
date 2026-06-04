import React from 'react';
import { useData } from '../../context/DataContext';
import { useProfile } from '../../context/ProfileContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import { RewardsComingSoon } from './RewardsComingSoon';
import { Star, Trophy, History } from 'lucide-react';

export const TokenWallet: React.FC = () => {
  const { currentProfile } = useProfile();
  const { ledger, loading } = useData();

  if (!currentProfile) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Token Balance Card */}
        <Card className="md:col-span-1 bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground shadow-lg flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 text-xs font-semibold uppercase tracking-wider">
                My Token Balance
              </p>
              <h3 className="text-4xl font-extrabold mt-1">
                {currentProfile.tokenBalance}
              </h3>
            </div>
            <div className="bg-white/20 p-2.5 rounded-full shadow-inner">
              <Star className="w-8 h-8 text-primary-foreground" fill="currentColor" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-primary-foreground/90 font-medium">
            <Trophy className="w-4 h-4" />
            <span>Complete activities to earn more!</span>
          </div>
        </Card>

        {/* Transaction History Card */}
        <Card className="md:col-span-2 bg-card border border-border shadow-sm flex flex-col h-[200px] md:h-auto">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <History className="w-4 h-4 text-primary" />
              <span>Earnings History (Last 20)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-4 overflow-hidden">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-6 bg-muted rounded"></div>
                <div className="h-6 bg-muted rounded"></div>
              </div>
            ) : ledger.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground italic">No tokens earned yet. Get to work! 💪</p>
              </div>
            ) : (
              <ScrollArea className="h-full max-h-[150px]">
                <div className="space-y-2.5">
                  {ledger.map((entry) => {
                    const formattedTime = new Date(entry.createdAt).toLocaleDateString();
                    return (
                      <div key={entry.id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm py-0.5">
                          <div>
                            <p className="font-semibold text-foreground">
                              Activity Approved
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formattedTime}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs">
                              +{entry.delta}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              Bal: {entry.balanceAfter}
                            </span>
                          </div>
                        </div>
                        <Separator className="bg-border/30" />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rewards Catalog */}
      <RewardsComingSoon />
    </div>
  );
};
