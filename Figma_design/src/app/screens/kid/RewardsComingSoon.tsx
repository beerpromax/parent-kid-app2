import React from 'react';
import { Card } from '../../components/ui/card';
import { Star, Gift, Lock } from 'lucide-react';
import { Button } from '../../components/ui/button';

export const RewardsComingSoon: React.FC = () => {
  const rewards = [
    {
      id: '1',
      title: 'Extra Screen Time',
      description: '30 minutes of screen time',
      cost: 20,
      icon: '📱',
    },
    {
      id: '2',
      title: 'Ice Cream Trip',
      description: 'Go get ice cream together',
      cost: 30,
      icon: '🍦',
    },
    {
      id: '3',
      title: 'Movie Night',
      description: 'Pick the movie for family night',
      cost: 25,
      icon: '🎬',
    },
    {
      id: '4',
      title: 'Stay Up Late',
      description: '30 minutes past bedtime',
      cost: 15,
      icon: '🌙',
    },
    {
      id: '5',
      title: 'New Toy',
      description: 'Small toy from the store',
      cost: 50,
      icon: '🎁',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Rewards Catalog</h2>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.map((reward) => (
          <Card
            key={reward.id}
            className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between group"
          >
            {/* Lock Overlay */}
            <div className="absolute top-2.5 right-2.5 bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Coming Soon</span>
            </div>

            <div>
              <div className="text-4xl my-3 text-center transition-transform duration-200 group-hover:scale-110">
                {reward.icon}
              </div>
              <h3 className="text-foreground font-bold text-center mb-1 text-base">
                {reward.title}
              </h3>
              <p className="text-xs text-muted-foreground text-center mb-5 leading-normal">
                {reward.description}
              </p>
            </div>

            <Button
              disabled
              className="w-full py-2 bg-muted text-muted-foreground font-semibold cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Star className="w-4 h-4" fill="currentColor" />
              <span>{reward.cost} tokens</span>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
