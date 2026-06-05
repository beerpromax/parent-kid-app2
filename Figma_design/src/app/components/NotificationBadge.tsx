import React from 'react';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  className = '',
}) => {
  if (count <= 0) return null;

  return (
    <span
      className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold leading-none text-white bg-destructive rounded-full scale-90 transition-transform ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};
