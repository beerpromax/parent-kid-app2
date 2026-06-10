import React from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Profile } from '../../lib/types';

interface ProfileBadgeProps {
  profile: Profile;
  showName?: boolean;
  className?: string;
  avatarSize?: 'sm' | 'md' | 'lg';
}

export const ProfileBadge: React.FC<ProfileBadgeProps> = ({
  profile,
  showName = true,
  className = '',
  avatarSize = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Avatar
        className={`${sizeClasses[avatarSize]} border-2 border-white shadow-sm transition-transform duration-200`}
        style={{ backgroundColor: profile.color || '#ff8b3d' }}
      >
        <AvatarFallback className="bg-transparent text-white font-medium flex items-center justify-center">
          {profile.emoji || profile.name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      {showName && (
        <span className="font-medium text-foreground text-sm">
          {profile.name}
        </span>
      )}
    </div>
  );
};
