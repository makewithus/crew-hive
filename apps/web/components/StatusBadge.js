'use client';

import { formatStatus } from '@/utils/formatting';
import {
  CheckCircle2,
  Clock,
  XCircle,
  UserCheck,
  HelpCircle,
  Ban,
  Check,
} from 'lucide-react';

export const StatusBadge = ({ status, type = 'crew', className = '' }) => {
  const s = String(status || '').toLowerCase().trim();

  const getBadgeConfig = () => {
    switch (s) {
      case 'confirmed_match':
      case 'confirmed':
        return {
          icon: UserCheck,
          styles: 'bg-primary/10 text-primary border-primary/30',
          label: 'Confirmed Match',
        };
      case 'approved':
      case 'accepted':
      case 'available':
        return {
          icon: CheckCircle2,
          styles: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          label: s === 'approved' ? 'Approved' : 'Accepted',
        };
      case 'pending':
        return {
          icon: Clock,
          styles: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          label: 'Pending',
        };
      case 'declined':
      case 'rejected':
        return {
          icon: XCircle,
          styles: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          label: s === 'declined' ? 'Declined' : 'Rejected',
        };
      case 'no_response':
      case 'expired':
        return {
          icon: HelpCircle,
          styles: 'bg-zinc-800/80 text-zinc-400 border-zinc-700',
          label: s === 'no_response' ? 'No Response' : 'Expired',
        };
      case 'cancelled':
        return {
          icon: Ban,
          styles: 'bg-zinc-800/80 text-zinc-400 border-zinc-700',
          label: 'Cancelled',
        };
      case 'completed':
        return {
          icon: Check,
          styles: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          label: 'Completed',
        };
      default:
        return {
          icon: null,
          styles: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          label: formatStatus(status),
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.styles} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;
