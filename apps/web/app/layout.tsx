import './globals.css';
import React from 'react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'LamaniAds Control Plane',
  description: 'Unified Ads Manager across Meta and Google Ads',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
