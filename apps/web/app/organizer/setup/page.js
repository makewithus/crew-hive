/**
 * /app/organizer/setup/page.js
 * Recruiter Setup & Profile Completion
 *
 * Implements Prompt 3 Section 3 (Step 3 & Step 4):
 * - Company or individual name
 * - City selection from taxonomy
 * - Mandatory consent capture (Terms, Privacy, Acceptable conduct, Consent version 1.0)
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createOrganizerProfile } from '@/lib/firestore';
import { CURRENT_CONSENT_VERSION } from '@/utils/taxonomy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/context/LanguageContext';
import { USER_ROLES } from '@/utils/constants';
import { Building2, FileCheck2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function OrganizerSetupPage() {
  const { currentUser, userPhone } = useAuth();
  const router = useRouter();
  const { isMalayalam } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companyOrName, setCompanyOrName] = useState('');
  const [city, setCity] = useState('Kochi');
  const [availableCities, setAvailableCities] = useState([]);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeConduct, setAgreeConduct] = useState(false);

  useEffect(() => {
    async function loadCities() {
      try {
        const res = await fetch('/api/taxonomy/cities');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setAvailableCities(json.data);
        }
      } catch (_) {}
    }
    loadCities();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!companyOrName.trim()) {
      setError(
        isMalayalam
          ? 'കമ്പനി അല്ലെങ്കിൽ വ്യക്തിഗത പേര് നൽകുക.'
          : 'Company or individual name is required.'
      );
      return;
    }
    if (!city.trim()) {
      setError(isMalayalam ? 'നഗരം തിരഞ്ഞെടുക്കുക.' : 'City is required.');
      return;
    }
    if (!agreeTerms || !agreeConduct) {
      setError(
        isMalayalam
          ? 'തുടരാൻ സേവന നിബന്ധനകളും പെരുമാറ്റച്ചട്ടവും അംഗീകരിക്കണം.'
          : 'You must accept the terms, privacy policy, and acceptable behaviour.'
      );
      return;
    }

    setLoading(true);

    try {
      const docId = currentUser?.phoneNumber || currentUser?.uid || userPhone;
      const result = await createOrganizerProfile(docId, {
        name: companyOrName.trim(),
        companyName: companyOrName.trim(),
        city,
        consentAccepted: true,
        consentVersion: CURRENT_CONSENT_VERSION,
        consentTimestamp: new Date().toISOString(),
      });

      if (result.success) {
        router.push('/organizer/dashboard');
      } else {
        setError(result.error || 'Failed to complete profile');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />

        <main className="flex-1 max-w-2xl mx-auto px-4 py-12 w-full">
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <div>
                <h1 className="text-2xl font-bold">
                  {isMalayalam
                    ? 'റിക്രൂട്ടർ പ്രൊഫൈൽ പൂർത്തിയാക്കുക'
                    : 'Complete Recruiter Profile'}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {isMalayalam
                    ? 'ക്രൂവിനെ കണ്ടെത്താനും വർക്ക് റിക്വസ്റ്റുകൾ അയയ്ക്കാനും നിങ്ങളുടെ വിവരങ്ങൾ നൽകുക.'
                    : 'Set up your organization to start searching for and booking crew members.'}
                </p>
              </div>
              <LanguageToggle compact />
            </div>

            {error && (
              <div className="mb-6 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold mb-2">
                  {isMalayalam
                    ? 'കമ്പനി അല്ലെങ്കിൽ വ്യക്തിഗത പേര് *'
                    : 'Company or Individual Name *'}
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    type="text"
                    value={companyOrName}
                    onChange={(e) => setCompanyOrName(e.target.value)}
                    placeholder="e.g. Arun Events & Media"
                    className="pl-9 bg-muted"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2">
                  {isMalayalam ? 'പ്രവർത്തന നഗരം *' : 'Base City / District *'}
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm font-medium focus:border-primary outline-none"
                >
                  {availableCities.length > 0 ? (
                    availableCities.map((c) => (
                      <option key={c.id || c.nameEn} value={c.nameEn}>
                        {isMalayalam && c.nameMl ? c.nameMl : c.nameEn}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Kochi">Kochi / കൊച്ചി</option>
                      <option value="Thiruvananthapuram">
                        Thiruvananthapuram / തിരുവനന്തപുരം
                      </option>
                      <option value="Kozhikode">Kozhikode / കോഴിക്കോട്</option>
                      <option value="Thrissur">Thrissur / തൃശ്ശൂർ</option>
                    </>
                  )}
                </select>
              </div>

              {/* Consent Section */}
              <div className="space-y-4 bg-muted/50 p-4 rounded-xl border border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  {isMalayalam ? 'സമ്മതപത്രം' : 'Agreement & Terms'}
                </h3>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-primary border-border focus:ring-primary"
                  />
                  <span className="text-xs text-foreground leading-relaxed">
                    {isMalayalam
                      ? 'ഞാൻ ക്രൂഹൈവിന്റെ സേവന നിബന്ധനകളും സ്വകാര്യതാ നയവും അംഗീകരിക്കുന്നു.'
                      : 'I agree to the CrewHive Terms of Service and Privacy Policy.'}
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeConduct}
                    onChange={(e) => setAgreeConduct(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-primary border-border focus:ring-primary"
                  />
                  <span className="text-xs text-foreground leading-relaxed">
                    {isMalayalam
                      ? 'ഞാൻ ന്യായമായ പ്രതിഫലവും മാന്യമായ തൊഴിൽ അന്തരീക്ഷവും ക്രൂ അംഗങ്ങൾക്ക് ഉറപ്പുനൽകുന്നു.'
                      : 'I agree to professional acceptable behavior, prompt payments, and respectful communication with technicians.'}
                  </span>
                </label>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded">
                    <FileCheck2 className="w-3 h-3" />
                    Consent Version {CURRENT_CONSENT_VERSION}
                  </span>
                  <span>Recorded</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !agreeTerms || !agreeConduct}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-5"
              >
                {loading
                  ? isMalayalam
                    ? 'സേവ് ചെയ്യുന്നു...'
                    : 'Saving...'
                  : isMalayalam
                  ? 'പ്രൊഫൈൽ സേവ് ചെയ്ത് തുടരുക'
                  : 'Save Profile & Continue'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
