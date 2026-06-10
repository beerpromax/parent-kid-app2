import React from 'react';
import { Gift, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { TokenChip } from './TokenChip';
import { useProfile } from '../context/ProfileContext';
import { Reward } from '../../lib/types';
import { ProfileBadge } from './ProfileBadge';

interface RewardCardProps {
  reward: Reward;
  actions?: React.ReactNode;
  statusBadge?: React.ReactNode;
  className?: string;
}

export const RewardCard: React.FC<RewardCardProps> = ({
  reward,
  actions,
  statusBadge,
  className = '',
}) => {
  const { profiles } = useProfile();
  const assignedKids = profiles.filter((p) => p.role === 'kid' && reward.forKidIds.includes(p.id));
  const isAssignedToAll = reward.forKidIds.length === 0;

  return (
    <Card className={`flex flex-col bg-card border border-border shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1 pr-4">
          <CardTitle className="text-foreground text-lg font-bold leading-snug line-clamp-1 flex items-center gap-1.5">
            <Gift className="w-5 h-5 text-primary shrink-0" />
            <span>{reward.title}</span>
          </CardTitle>
        </div>
        {reward.status === 'proposed' ? (
          <span className="text-xs font-semibold bg-secondary/80 text-muted-foreground px-3 py-1.5 rounded-full">
            Proposed
          </span>
        ) : (
          <TokenChip amount={reward.tokenCost} />
        )}
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        {reward.description ? (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
            {reward.description}
          </p>
        ) : (
          <div className="mb-4 h-5" />
        )}

        {/* Kids assignment row */}
        <div className="flex items-center gap-2 mt-auto">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>For:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {isAssignedToAll ? (
              <span className="text-xs font-semibold text-primary bg-secondary/50 px-2 py-0.5 rounded-md">
                All Kids
              </span>
            ) : (
              assignedKids.map((kid) => (
                <div key={kid.id} title={kid.name}>
                  <ProfileBadge
                    profile={kid}
                    showName={false}
                    avatarSize="sm"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>

      {(actions || statusBadge) && (
        <CardFooter className="pt-3 pb-4 px-5 flex items-center justify-between border-t border-border/10">
          <div className="w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">{statusBadge}</div>
            <div className="flex items-center gap-1">{actions}</div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};
