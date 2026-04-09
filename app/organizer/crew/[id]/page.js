'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getCrewProfile, createBooking, getOrganizerProfile } from '@/lib/firestore';
import { sendBookingNotificationToCrew } from '@/lib/conversation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import AuthGuard from '@/components/AuthGuard';
import { formatCurrency, formatDate } from '@/utils/formatting';
import { USER_ROLES } from '@/utils/constants';
import Link from 'next/link';

export default function CrewProfilePage({ params }) {
  const { currentUser } = useAuth();
  const crewId = params.id;
  const [crew, setCrew] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingData, setBookingData] = useState({
    date: '',
    location: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCrew();
  }, [crewId]);

  const loadCrew = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getCrewProfile(crewId);
      if (result.success) {
        setCrew(result.data);
      } else {
        setError('Crew member not found');
      }
    } catch (err) {
      console.error('[v0] Load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingChange = (e) => {
    const { name, value } = e.target;
    setBookingData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    setError('');

    if (!bookingData.date || !bookingData.location) {
      setError('Date and location are required');
      return;
    }

    setSubmitting(true);

    try {
      const result = await createBooking({
        crewId,
        organizerId: currentUser.uid,
        date: bookingData.date,
        location: bookingData.location,
        notes: bookingData.notes,
        rate: crew.ratePerDay,
      });

      if (result.success) {
        // Fetch organizer name for the notification message
        let organizerName = 'An organizer';
        try {
          const orgResult = await getOrganizerProfile(currentUser.uid);
          if (orgResult.success && orgResult.data?.name) {
            organizerName = orgResult.data.name;
          }
        } catch (_) {}

        const jobDetails = `Date: ${bookingData.date} | Location: ${bookingData.location}${bookingData.notes ? ` | Notes: ${bookingData.notes}` : ''}`;

        // Notify crew via conversation engine — sets their chat to booking_response step
        await sendBookingNotificationToCrew(
          crewId,
          result.bookingId,
          organizerName,
          jobDetails
        );

        alert('Booking request sent! The crew member has been notified.');
        setBookingData({ date: '', location: '', notes: '' });
        setShowBookingForm(false);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[v0] Booking error:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!crew || error) {
    return (
      <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
        <Header />
        <div className="min-h-screen bg-background">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <p className="text-red-700 text-lg">{error || 'Crew not found'}</p>
            <Link href="/organizer/search">
              <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
                Back to Search
              </Button>
            </Link>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
      <Header />
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link href="/organizer/search" className="text-primary hover:text-primary/90 font-medium mb-8 inline-block">
            ← Back to Search
          </Link>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="h-48 bg-muted flex items-center justify-center text-6xl">
              {crew.profileImage ? (
                <img src={crew.profileImage} alt={crew.name} className="w-full h-full object-cover" />
              ) : (
                '📷'
              )}
            </div>

            {/* Content */}
            <div className="p-8">
              <h1 className="text-4xl font-bold text-foreground mb-2">{crew.name}</h1>
              <p className="text-primary text-lg font-medium mb-6">{crew.role}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-8 border-b border-border">
                <div>
                  <p className="text-muted-foreground text-sm">Experience Level</p>
                  <p className="text-lg font-medium text-foreground">{crew.experience}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Location</p>
                  <p className="text-lg font-medium text-foreground">{crew.city}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Travel Range</p>
                  <p className="text-lg font-medium text-foreground">{crew.travelRange} km</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Rate Per Day</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(crew.ratePerDay)}</p>
                </div>
              </div>

              {crew.bio && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-foreground mb-3">About</h2>
                  <p className="text-muted-foreground">{crew.bio}</p>
                </div>
              )}

              {crew.portfolioLink && (
                <div className="mb-8">
                  <a
                    href={crew.portfolioLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/90 font-medium"
                  >
                    View Portfolio →
                  </a>
                </div>
              )}

              <div className="mb-8">
                <p className="text-muted-foreground text-sm">Member Since</p>
                <p className="text-lg font-medium text-foreground">{formatDate(crew.createdAt)}</p>
              </div>

              {/* Booking Form */}
              {!showBookingForm ? (
                <Button
                  onClick={() => setShowBookingForm(true)}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-3 text-lg"
                >
                  Request Booking
                </Button>
              ) : (
                <form onSubmit={handleSubmitBooking} className="space-y-4 p-6 bg-muted rounded-lg">
                  <h3 className="font-bold text-foreground">Request a Booking</h3>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Event Date
                    </label>
                    <Input
                      type="date"
                      name="date"
                      value={bookingData.date}
                      onChange={handleBookingChange}
                      className="bg-card border border-border text-foreground"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Location
                    </label>
                    <Input
                      type="text"
                      name="location"
                      value={bookingData.location}
                      onChange={handleBookingChange}
                      placeholder="Event location"
                      className="bg-card border border-border text-foreground"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      name="notes"
                      value={bookingData.notes}
                      onChange={handleBookingChange}
                      placeholder="Any specific requirements..."
                      rows="3"
                      className="w-full px-4 py-2 bg-card border border-border rounded text-foreground resize-none"
                    ></textarea>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {submitting ? 'Sending...' : 'Send Request'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowBookingForm(false)}
                      variant="outline"
                      className="flex-1 border-border text-foreground hover:bg-muted"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
