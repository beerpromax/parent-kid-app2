import React from 'react';
import { Star } from 'lucide-react';
import { Badge } from './ui/badge';

interface TokenChipProps {
  amount: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const TokenChip: React.FC<TokenChipProps> = ({ amount, className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5 gap-1',
    md: 'text-sm px-3.5 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2.5 gap-2',
  };

  const starSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <Badge
      variant="secondary"
      className={`inline-flex items-center font-bold bg-secondary text-primary rounded-full border-none shadow-sm transition-colors ${sizeClasses[size]} ${className}`}
    >
      <Star className={`${starSizes[size]} text-primary`} fill="currentColor" />
      <span>{amount}</span>
    </Badge>
  );
};
