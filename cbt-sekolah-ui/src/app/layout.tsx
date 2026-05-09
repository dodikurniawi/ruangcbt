import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CBT Sekolah - Platform Ujian Berbasis Komputer Modern",
  description: "Platform Computer Based Test (CBT) yang dirancang khusus untuk kurikulum K-12. Menghadirkan integritas ujian tinggi dengan antarmuka yang tenang dan bebas gangguan bagi siswa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} antialiased min-h-screen bg-background text-on-surface font-body-student selection:bg-primary-fixed selection:text-on-primary-fixed`}>
        {children}
      </body>
    </html>
  );
}
