import './globals.css';
import React from 'react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'LamaniAds Control Plane',
  description: 'Unified Ads Manager across Meta and Google Ads',
  icons: {
    icon: 'https://res.cloudinary.com/lamanify/image/upload/v1780368032/Lamanify_45_upzope.webp',
  },
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
