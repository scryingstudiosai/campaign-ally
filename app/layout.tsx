import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Campaign Ally - Every great DM deserves an ally',
  description: 'Your AI Co-DM for creating NPCs, taverns, hooks, and more',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <Toaster />
        <SonnerToaster
          position="bottom-right"
          expand={false}
          richColors
          closeButton
          theme="dark"
        />
      </body>
    </html>
  );
}
