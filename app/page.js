'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function Home() {
  const { currentUser, userRole, isSuperAdmin, userApproved, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !currentUser) return;
    if (isSuperAdmin) { router.push('/super-admin/dashboard'); return; }
    if (userApproved === false) { router.push('/pending-approval'); return; }
    if (userRole === 'crew') { router.push('/crew/dashboard'); return; }
    if (userRole === 'organizer') { router.push('/organizer/dashboard'); return; }
    if (userRole === 'admin') { router.push('/admin/dashboard'); return; }
  }, [loading, currentUser, userRole, isSuperAdmin, userApproved, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Background glows ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-60 w-[500px] h-[500px] bg-primary/4 rounded-full blur-3xl" />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
              <span className="text-primary-foreground font-bold text-sm">C</span>
            </div>
            <span className="text-xl font-bold text-foreground">CrewHive</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dev/simulator"
              className="text-sm text-muted-foreground hover:text-primary transition-colors hidden sm:block"
            >
              Try Simulator
            </Link>
            <Link
              href="/auth/phone"
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-primary text-xs font-semibold tracking-wide uppercase">WhatsApp-First Platform</span>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-tight mb-6">
          Register on{' '}
          <span className="text-primary relative">
            WhatsApp
            <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-primary/40 rounded-full" />
          </span>
          <br />
          <span className="text-foreground/80">Sign In on Web</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          CrewHive is a verified network for professional crew and event organizers.
          Complete your profile via WhatsApp — once approved by our admin team, access your dashboard here.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/phone"
            className="group inline-flex items-center justify-center gap-2.5 bg-primary text-primary-foreground font-bold px-8 py-4 rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 text-base"
          >
            <span>Sign In with Phone</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            href="/dev/simulator"
            className="inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground font-semibold px-8 py-4 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-base"
          >
            <span className="text-xl">💬</span>
            Try WhatsApp Bot
          </Link>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">How it works</h2>
          <p className="text-muted-foreground">Three simple steps to get started</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              icon: '💬',
              title: 'Register via WhatsApp',
              desc: 'Chat with our WhatsApp bot to complete your crew or organizer profile. Your data is securely saved to Firebase.',
              color: 'from-primary/20 to-transparent',
              border: 'border-primary/30',
            },
            {
              step: '02',
              icon: '🛡️',
              title: 'Admin Verification',
              desc: 'Our super admin reviews your profile and approves access. This ensures a trusted, verified network.',
              color: 'from-blue-500/15 to-transparent',
              border: 'border-blue-500/20',
            },
            {
              step: '03',
              icon: '🚀',
              title: 'Access Dashboard',
              desc: 'Once approved, sign in with your phone OTP and your dashboard is ready — all profile data pre-loaded from WhatsApp.',
              color: 'from-green-500/15 to-transparent',
              border: 'border-green-500/20',
            },
          ].map((item, i) => (
            <div
              key={i}
              className={`relative rounded-2xl border ${item.border} p-8 bg-gradient-to-br ${item.color} backdrop-blur overflow-hidden`}
            >
              <div className="absolute top-4 right-5 text-6xl font-black text-white/4 select-none">
                {item.step}
              </div>
              <div className="text-4xl mb-5">{item.icon}</div>
              <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Role cards ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Crew */}
          <div className="group rounded-2xl border border-border bg-card hover:border-primary/40 transition-all p-8 hover:bg-primary/5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-all">
              <span className="text-3xl">🎬</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">For Crew</h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Cinematographers, sound engineers, editors, drone pilots and more — showcase your skills and get discovered by verified organizers.
            </p>
            <div className="space-y-2">
              {['Verified profile on the platform', 'Receive booking requests via WhatsApp', 'Accept or decline jobs instantly'].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                    <span className="text-primary text-xs">✓</span>
                  </span>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Organizer */}
          <div className="group rounded-2xl border border-border bg-card hover:border-purple-500/40 transition-all p-8 hover:bg-purple-500/5">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-all">
              <span className="text-3xl">📋</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">For Organizers</h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Event producers, production houses, and agencies — search a curated pool of pre-verified crew members and book instantly.
            </p>
            <div className="space-y-2">
              {['Search crew by role, city & experience', 'Real-time availability tracking', 'Manage all bookings from one dashboard'].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                    <span className="text-purple-400 text-xs">✓</span>
                  </span>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Hierarchy info ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-10 pb-24">
        <div className="rounded-2xl border border-border bg-card px-8 py-10">
          <h2 className="text-xl font-bold text-foreground mb-7 text-center">Platform Hierarchy</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0">
            {[
              { label: 'Super Admin', sub: 'Full access · Approves users', icon: '👑', active: true },
              { label: 'Admin', sub: 'Approves crew profiles', icon: '🛡️', active: false },
              { label: 'Organizer', sub: 'Books crew members', icon: '📋', active: false },
              { label: 'Crew', sub: 'Gets hired for jobs', icon: '🎬', active: false },
            ].map((role, i, arr) => (
              <div key={i} className="flex items-center">
                <div className={`flex flex-col items-center text-center px-5 py-3 rounded-xl ${role.active ? 'bg-primary/10 border border-primary/30' : ''}`}>
                  <span className="text-2xl mb-1">{role.icon}</span>
                  <p className={`text-sm font-bold ${role.active ? 'text-primary' : 'text-foreground'}`}>{role.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{role.sub}</p>
                </div>
                {i < arr.length - 1 && (
                  <svg className="w-5 h-5 text-border mx-1 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-border bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">C</span>
            </div>
            <span className="text-sm text-muted-foreground font-medium">CrewHive</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 CrewHive. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/auth/phone" className="text-xs text-muted-foreground hover:text-primary transition-colors">Sign In</Link>
            <Link href="/dev/simulator" className="text-xs text-muted-foreground hover:text-primary transition-colors">Simulator</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
