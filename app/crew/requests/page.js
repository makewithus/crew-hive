'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToCrewBookings, updateBooking, updateCrewProfile } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import AuthGuard from '@/components/AuthGuard';
import StatusBadge from '@/components/StatusBadge';
import { formatDate } from '@/utils/formatting';
import { USER_ROLES } from '@/utils/constants';

export default function CrewRequestsPage() {
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Real-time listener — booking list updates live
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const unsubscribe = subscribeToCrewBookings(currentUser.uid, (result) => {
      if (result.success) {
        setBookings(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleUpdateBooking = async (bookingId, newStatus) => {
    setUpdatingId(bookingId);
    setError('');

    try {
      const result = await updateBooking(bookingId, { status: newStatus });
      if (result.success) {
        // When crew accepts a job, mark them as unavailable
        if (newStatus === 'accepted') {
          await updateCrewProfile(currentUser.uid, { available: false });
        }
        // onSnapshot will update the bookings list automatically
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[v0] Update error:', err);
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.CREW}>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-foreground font-medium">Loading...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={USER_ROLES.CREW}>
      <Header />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-foreground">Booking Requests</h1>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">No booking requests yet</p>
              <p className="text-muted-foreground">
                Keep your profile updated to get more booking requests
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="p-6 bg-card border border-border rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-lg font-bold text-foreground">Booking Request</p>
                      <p className="text-muted-foreground text-sm mt-1">
                        From Organizer • {formatDate(booking.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} type="booking" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 py-4 border-t border-border">
                    {booking.date && (
                      <div>
                        <p className="text-xs text-muted-foreground">Event Date</p>
                        <p className="font-medium text-foreground">{formatDate(booking.date)}</p>
                      </div>
                    )}
                    {booking.location && (
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="font-medium text-foreground">{booking.location}</p>
                      </div>
                    )}
                    {booking.rate && (
                      <div>
                        <p className="text-xs text-muted-foreground">Rate Offered</p>
                        <p className="font-medium text-foreground">${booking.rate}</p>
                      </div>
                    )}
                  </div>

                  {booking.notes && (
                    <div className="mb-4 p-4 bg-muted rounded">
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm text-foreground">{booking.notes}</p>
                    </div>
                  )}

                  {booking.status === 'pending' && (
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleUpdateBooking(booking.id, 'accepted')}
                        disabled={updatingId === booking.id}
                        className="flex-1 bg-green-600 text-white hover:bg-green-700"
                      >
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleUpdateBooking(booking.id, 'rejected')}
                        disabled={updatingId === booking.id}
                        variant="outline"
                        className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
