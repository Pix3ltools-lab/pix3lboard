import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/components/providers/AppProvider';
import { ToastContainer } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pix3lBoard - Kanban for Project Management',
  description: 'Cloud-based project management tool for AI creators. Your data syncs across all devices.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <AppProvider>
          {children}
          <ToastContainer />
          <ConfirmDialog />
        </AppProvider>
        {process.env.VERCEL && <Analytics />}
        {process.env.VERCEL && <SpeedInsights />}
      </body>
    </html>
  );
}
