import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/hooks/useAuth'
import { LanguageProvider } from '@/context/LanguageContext'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0D0D0D',
}

export const metadata: Metadata = {
  title: 'CrewHive - Book Professional Crew',
  description: 'Find and book professional crew members for your events and projects',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies();
  const savedLang = cookieStore.get('crewhive_lang')?.value;
  const initialLang = savedLang === 'ml' ? 'ml' : 'en';

  return (
    <html lang={initialLang} className={`${inter.variable} dark ${initialLang === 'ml' ? 'lang-ml' : ''}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <LanguageProvider initialLocale={initialLang}>
            {children}
          </LanguageProvider>
        </AuthProvider>
        <Toaster
          theme="dark"
          position="top-right"
          richColors
          closeButton
          toastOptions={{ style: { fontFamily: 'var(--font-inter), "Helvetica Neue", Helvetica, Arial, sans-serif' } }}
        />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
