import localFont from 'next/font/local';

import type { Metadata } from 'next';

import './globals.css';

const fraunces = localFont({
  src: '../state/brand/fonts/fraunces/Fraunces[SOFT,WONK,opsz,wght].woff2',
  variable: '--font-heading',
});

const inter = localFont({
  src: '../state/brand/fonts/inter/InterVariable.woff2',
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Nail Tech Assistant',
  description: 'Project scaffold for the Nail Tech Assistant app.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${inter.variable}`}>
        {children}
      </body>
    </html>
  );
}
