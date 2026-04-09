'use client';

import { useState } from 'react';
import { COLORS, AVAILABILITY_STATUSES } from '@/utils/constants';

export const AvailabilityToggle = ({ isAvailable, onChange, disabled = false, loading = false }) => {
  const handleToggle = () => {
    if (!disabled && !loading) {
      onChange(!isAvailable);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isAvailable ? 'bg-green-500' : 'bg-red-500'
          }`}
        ></div>
        <span className="text-sm font-medium text-foreground">
          {isAvailable ? 'Available' : 'Not Available'}
        </span>
      </div>

      <button
        onClick={handleToggle}
        disabled={disabled || loading}
        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
          isAvailable ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-300 hover:bg-gray-400'
        } ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
            isAvailable ? 'translate-x-6' : 'translate-x-1'
          }`}
        ></span>
      </button>
    </div>
  );
};

export default AvailabilityToggle;
