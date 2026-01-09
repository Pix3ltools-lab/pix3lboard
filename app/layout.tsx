import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/components/providers/AppProvider';
import { ToastContainer } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'pix3lboard - Kanban for AI Creators',
  description: 'Privacy-first Kanban board for AI music video creators',
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
      </body>
    </html>
  );
}
