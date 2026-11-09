import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Graviblog // Pixel Punch - Neo-Brutalist Gaming & Creative News',
  description: 'Unfiltered underground gaming dispatches, hardware tear-downs, design manifestos, and retro arcade forensics.',
  openGraph: {
    title: 'Graviblog // Pixel Punch - Neo-Brutalist Gaming & Creative News',
    description: 'Unfiltered underground gaming dispatches, hardware tear-downs, design manifestos, and retro arcade forensics.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Graviblog // Pixel Punch',
    description: 'Unfiltered underground gaming dispatches and hardware analysis.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#fff9ef] dark:bg-[#12100e] text-[#1d1b16] dark:text-[#f6f0e7] antialiased selection:bg-[#FF8A3D] selection:text-black min-h-screen">
        {children}
      </body>
    </html>
  );
}
