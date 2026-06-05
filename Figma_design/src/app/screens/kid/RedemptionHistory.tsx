import React from 'react';
import { useData } from '../../context/DataContext';
import { useProfile } from '../../context/ProfileContext';
import { EmptyState } from '../../components/EmptyState';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Gift, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { TokenChip } from '../../components/TokenChip';

export const RedemptionHistory: React.FC = () => {
  const { redemptions, loading } = useData();
  const { currentProfile } = useProfile();

  if (!currentProfile) return null;

  // Filter redemptions for this kid
  const kidRedemptions = redemptions.filter((r) => r.kidId === currentProfile.id);

  const formatDate = (epochMs: number) => {
    return new Date(epochMs).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((n) => (
          <div key={n} className="h-20 bg-muted animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Redemption History</h2>
        <p className="text-sm text-muted-foreground">Keep track of your redeemed rewards and parent fulfillment</p>
      </div>

      {kidRedemptions.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No redemptions yet"
          description="Once you redeem rewards, they will appear here!"
        />
      ) : (
        <div className="space-y-3">
          {kidRedemptions.map((red) => {
            let statusBadge = (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-none flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Requested</span>
              </Badge>
            );

            if (red.status === 'fulfilled') {
              statusBadge = (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-500 border-none flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Fulfilled</span>
                </Badge>
              );
            } else if (red.status === 'refunded') {
              statusBadge = (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-500 border-none flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Refunded</span>
                </Badge>
              );
            }

            return (
              <Card key={red.id} className="border border-border bg-card shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Gift className="w-4 h-4 text-primary shrink-0" />
                      <span>{red.rewardTitleSnapshot}</span>
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      Requested: {formatDate(red.requestedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TokenChip amount={red.tokenCostSnapshot} size="sm" />
                    {statusBadge}
                  </div>
                </CardHeader>
                {red.note && (
                  <CardContent className="p-4 pt-0 text-xs text-muted-foreground border-t border-border/10 mt-2">
                    <p className="mt-1 leading-relaxed bg-muted/30 p-2 rounded-md italic">
                      Note: "{red.note}"
                    </p>
                  </CardContent>
                )}
                {red.resolvedAt && (
                  <CardContent className="p-4 pt-0 text-xs text-muted-foreground mt-1">
                    <span className="font-semibold">Resolved:</span> {formatDate(red.resolvedAt)}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
