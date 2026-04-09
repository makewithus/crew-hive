'use client';

import Header from '@/components/Header';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { USER_ROLES } from '@/utils/constants';

export default function CrewVerifyPage() {
  return (
    <AuthGuard requiredRole={USER_ROLES.CREW}>
      <Header />
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-foreground">Verification</h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="p-8 bg-card border border-border rounded-lg text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Verification Coming Soon
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Enhanced verification features including identity verification and portfolio validation 
              are coming soon to help you build credibility on CrewHive.
            </p>
            <Link href="/crew/dashboard">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
