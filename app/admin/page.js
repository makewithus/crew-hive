'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToPendingCrew, approveCrewMember, rejectCrewMember } from '@/lib/firestore';
import { sendTextMessage } from '@/lib/whatsapp';

export default function AdminDashboard() {
  const { isAdmin, loading, isAuthenticated, userRole, logout } = useAuth();
  const router = useRouter();
  const [pendingCrew, setPendingCrew] = useState([]);
  const [processing, setProcessing] = useState({}); // { [id]: 'approving' | 'rejecting' }
  const [toast, setToast] = useState(null);

  // Auth guard
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!isAdmin) {
        router.push('/');
      }
    }
  }, [loading, isAuthenticated, isAdmin, router]);

  // Real-time pending crew subscription
  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = subscribeToPendingCrew(({ success, data }) => {
      if (success) setPendingCrew(data);
    });
    return unsubscribe;
  }, [isAdmin]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleApprove = async (crew) => {
    setProcessing((p) => ({ ...p, [crew.id]: 'approving' }));
    try {
      const result = await approveCrewMember(crew.id);
      if (result.success) {
        // Send WhatsApp notification
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crewhive.app';
        await sendTextMessage(
          crew.id,
          `🎉 *Congratulations, ${crew.name || 'Crew Member'}!*\n\nYour CrewHive profile has been *approved*. You can now log in and start getting booked!\n\n👉 Log in at: ${appUrl}/login`
        );
        showToast(`${crew.name || crew.id} approved!`);
      } else {
        showToast(result.error || 'Failed to approve.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error approving.', 'error');
    } finally {
      setProcessing((p) => { const n = { ...p }; delete n[crew.id]; return n; });
    }
  };

  const handleReject = async (crew) => {
    setProcessing((p) => ({ ...p, [crew.id]: 'rejecting' }));
    try {
      const result = await rejectCrewMember(crew.id);
      if (result.success) {
        await sendTextMessage(
          crew.id,
          `ℹ️ Hi ${crew.name || 'there'}, your CrewHive application was not approved at this time. Feel free to reapply after updating your profile.`
        );
        showToast(`${crew.name || crew.id} rejected.`, 'info');
      } else {
        showToast(result.error || 'Failed to reject.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error rejecting.', 'error');
    } finally {
      setProcessing((p) => { const n = { ...p }; delete n[crew.id]; return n; });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg border transition-all
          ${toast.type === 'error' ? 'bg-red-900/80 border-red-700 text-red-200' :
            toast.type === 'info' ? 'bg-zinc-800 border-zinc-600 text-zinc-200' :
            'bg-green-900/80 border-green-700 text-green-200'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#F5A623] rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-xs">CH</span>
          </div>
          <div>
            <span className="text-white font-semibold">CrewHive</span>
            <span className="text-zinc-500 text-xs ml-2">Admin</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-zinc-400 hover:text-white text-sm transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Pending Approvals</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {pendingCrew.length} crew member{pendingCrew.length !== 1 ? 's' : ''} awaiting review
          </p>
        </div>

        {/* Crew list */}
        {pendingCrew.length === 0 ? (
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-white font-medium mb-1">All caught up!</p>
            <p className="text-zinc-400 text-sm">No pending approvals right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingCrew.map((crew) => {
              const isProcessing = !!processing[crew.id];
              return (
                <div
                  key={crew.id}
                  className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-[#F5A623]/20 border border-[#F5A623]/30 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-[#F5A623] font-semibold text-lg">
                      {(crew.name || '?')[0].toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold">{crew.name || 'Unknown'}</h3>
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-zinc-400 text-sm">
                      {crew.role && <span>🎬 {crew.role}</span>}
                      {crew.city && <span>📍 {crew.city}</span>}
                      {crew.experience && <span>⏱ {crew.experience}</span>}
                      {crew.phone && <span>📱 {crew.phone}</span>}
                    </div>
                    <p className="text-zinc-600 text-xs mt-1">
                      Registered: {crew.createdAt ? new Date(crew.createdAt).toLocaleDateString() : '—'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleReject(crew)}
                      disabled={isProcessing}
                      className="px-4 py-2 text-sm border border-zinc-700 text-zinc-300 hover:border-red-600 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors"
                    >
                      {processing[crew.id] === 'rejecting' ? '...' : 'Reject'}
                    </button>
                    <button
                      onClick={() => handleApprove(crew)}
                      disabled={isProcessing}
                      className="px-4 py-2 text-sm bg-[#F5A623] hover:bg-[#E8960F] disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold rounded-xl transition-colors"
                    >
                      {processing[crew.id] === 'approving' ? '...' : 'Approve'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
