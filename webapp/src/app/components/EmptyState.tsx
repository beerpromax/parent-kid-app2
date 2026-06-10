import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-xl bg-card/50 shadow-sm ${className}`}>
      <div className="bg-muted p-4 rounded-full text-muted-foreground mb-4">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {actionText && onAction && (
        <Button onClick={onAction} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
          {actionText}
        </Button>
      )}
    </div>
  );
};
