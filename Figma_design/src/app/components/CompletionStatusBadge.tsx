import React from 'react';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { CompletionStatus } from '../../lib/types';

interface CompletionStatusBadgeProps {
  status: CompletionStatus;
  className?: string;
}

export const CompletionStatusBadge: React.FC<CompletionStatusBadgeProps> = ({ status, className = '' }) => {
  const configs = {
    pending: {
      label: 'Pending',
      icon: Clock,
      classes: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50',
    },
    approved: {
      label: 'Approved',
      icon: CheckCircle2,
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50',
    },
    rejected: {
      label: 'Rejected',
      icon: XCircle,
      classes: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50',
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 font-semibold px-2.5 py-0.5 rounded-md border ${config.classes} ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </Badge>
  );
};
