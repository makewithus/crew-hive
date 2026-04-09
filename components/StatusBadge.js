'use client';

import { formatStatus } from '@/utils/formatting';
import { CREW_STATUS, BOOKING_STATUS, COLORS } from '@/utils/constants';

export const StatusBadge = ({ status, type = 'crew' }) => {
  const getStatusStyles = () => {
    if (type === 'crew') {
      switch (status) {
        case CREW_STATUS.APPROVED:
          return 'bg-green-100 text-green-800 border border-green-300';
        case CREW_STATUS.PENDING:
          return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
        case CREW_STATUS.REJECTED:
          return 'bg-red-100 text-red-800 border border-red-300';
        default:
          return 'bg-gray-100 text-gray-800 border border-gray-300';
      }
    }

    if (type === 'booking') {
      switch (status) {
        case BOOKING_STATUS.ACCEPTED:
          return 'bg-green-100 text-green-800 border border-green-300';
        case BOOKING_STATUS.PENDING:
          return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
        case BOOKING_STATUS.REJECTED:
          return 'bg-red-100 text-red-800 border border-red-300';
        case BOOKING_STATUS.COMPLETED:
          return 'bg-blue-100 text-blue-800 border border-blue-300';
        case BOOKING_STATUS.CANCELLED:
          return 'bg-gray-100 text-gray-800 border border-gray-300';
        default:
          return 'bg-gray-100 text-gray-800 border border-gray-300';
      }
    }

    return 'bg-gray-100 text-gray-800 border border-gray-300';
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusStyles()}`}>
      {formatStatus(status)}
    </span>
  );
};

export default StatusBadge;
