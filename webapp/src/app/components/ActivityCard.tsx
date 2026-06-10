import React from 'react';
import { Clock, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { TokenChip } from './TokenChip';
import { useProfile } from '../context/ProfileContext';
import { Activity } from '../../lib/types';
import { ProfileBadge } from './ProfileBadge';

interface ActivityCardProps {
  activity: Activity;
  actions?: React.ReactNode;
  statusBadge?: React.ReactNode;
  className?: string;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  actions,
  statusBadge,
  className = '',
}) => {
  const { profiles } = useProfile();
  const assignedKids = profiles.filter((p) => p.role === 'kid' && activity.assignedKidIds.includes(p.id));
  const isAssignedToAll = activity.assignedKidIds.length === 0;

  return (
    <Card className={`flex flex-col bg-card border border-border shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1 pr-4">
          <CardTitle className="text-foreground text-lg font-bold leading-snug line-clamp-1 flex items-center gap-2">
            <span>{activity.title}</span>
            {activity.status === 'negotiating' && (
              <span className="text-[10px] bg-blue-500/10 text-blue-500 font-extrabold px-2 py-0.5 rounded-full shrink-0 border border-blue-500/20">
                Negotiating
              </span>
            )}
          </CardTitle>
          {activity.durationMinutes ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{activity.durationMinutes} min</span>
            </div>
          ) : null}
        </div>
        <TokenChip amount={activity.tokenValue} />
      </CardHeader>
      
      <CardContent className="flex-1 pb-4">
        {activity.description ? (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
            {activity.description}
          </p>
        ) : (
          <div className="mb-4 h-5" />
        )}
        
        {/* Kids assignment row */}
        <div className="flex items-center gap-2 mt-auto">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>Assigned:</span>
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
            <div>{statusBadge}</div>
            <div>{actions}</div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};
