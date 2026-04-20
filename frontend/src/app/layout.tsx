import type { Metadata } from 'next';
import './globals.css';
import SidebarLayout from '@/components/SidebarLayout';

import BackgroundMesh from '@/components/BackgroundMesh';

export const metadata: Metadata = {
  title: 'College Portal RIT',
  description: 'AI Knowledge Base for RIT',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <BackgroundMesh />
        <SidebarLayout>
          {children}
        </SidebarLayout>
      </body>
    </html>
  );
}
