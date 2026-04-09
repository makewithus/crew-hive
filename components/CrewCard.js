'use client';

import { formatCurrency } from '@/utils/formatting';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const CrewCard = ({ crew, onActionClick = null, actionLabel = null, showActions = false }) => {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Profile Image */}
      <div className="w-full h-48 bg-muted flex items-center justify-center text-4xl">
        {crew.profileImage ? (
          <img src={crew.profileImage} alt={crew.name} className="w-full h-full object-cover" />
        ) : (
          '📷'
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-lg font-bold text-foreground mb-2">{crew.name}</h3>
        
        {crew.role && (
          <p className="text-sm text-primary font-medium mb-3">{crew.role}</p>
        )}

        {crew.experience && (
          <p className="text-sm text-muted-foreground mb-2">
            Experience: <span className="font-medium text-foreground">{crew.experience}</span>
          </p>
        )}

        {crew.city && (
          <p className="text-sm text-muted-foreground mb-2">
            Location: <span className="font-medium text-foreground">{crew.city}</span>
          </p>
        )}

        {crew.travelRange && (
          <p className="text-sm text-muted-foreground mb-4">
            Travel Range: <span className="font-medium text-foreground">{crew.travelRange} km</span>
          </p>
        )}

        {crew.ratePerDay && (
          <p className="text-lg font-bold text-primary mb-4">
            {formatCurrency(crew.ratePerDay)} / day
          </p>
        )}

        {crew.bio && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {crew.bio}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link href={`/organizer/crew/${crew.uid}`} className="flex-1">
            <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted">
              View Profile
            </Button>
          </Link>
          
          {showActions && actionLabel && onActionClick && (
            <Button
              onClick={() => onActionClick(crew)}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrewCard;
