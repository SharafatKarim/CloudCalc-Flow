import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CloudCalc Flow — Cloud Architecture Simulator",
  description:
    "Visually design cloud architectures, simulate user traffic, and estimate real-time cost and performance.",
};

// Applies the persisted theme before paint to avoid a flash of the wrong theme.
const noFlashTheme = `try{var s=JSON.parse(localStorage.getItem('ccf-ui'));if(s&&s.state&&s.state.theme==='dark'){document.documentElement.classList.add('dark')}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
