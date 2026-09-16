import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PresentAI — Practice. Present. Improve.',
  description:
    'PresentAI membantu kamu berlatih presentasi dengan AI. Analisis bicara, bahasa tubuh, penguasaan materi, dan Q&A dengan feedback yang personal.',
  keywords: ['presentasi', 'AI', 'public speaking', 'latihan', 'feedback', 'presentation training'],
  openGraph: {
    title: 'PresentAI — Practice. Present. Improve.',
    description: 'Platform AI untuk melatih kemampuan presentasi dan wawancara.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 dark:bg-gray-950`}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'var(--toast-bg)',
                    color: 'var(--toast-color)',
                    borderRadius: '12px',
                    border: '1px solid var(--toast-border)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                  },
                  success: {
                    iconTheme: { primary: '#22c55e', secondary: '#fff' },
                  },
                  error: {
                    iconTheme: { primary: '#ef4444', secondary: '#fff' },
                  },
                }}
              />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
