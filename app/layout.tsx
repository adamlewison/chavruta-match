import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0b1736",
};

export const metadata: Metadata = {
  title: "Vruta — Find Your Chavruta.",
  description:
    "Connect with Jewish learners for chavruta study based on shared interests, mutual availability, and location. Find your study partner and grow together.",
  applicationName: "Vruta",
  icons: {
    icon: [
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon.ico", rel: "shortcut icon" },
    ],
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/favicon/site.webmanifest",
  openGraph: {
    title: "Vruta — Find Your Chavruta. Grow Together.",
    description:
      "Connect with Jewish learners for chavruta study based on shared interests, mutual availability, and location.",
    type: "website",
    url: "https://vruta.app",
    siteName: "Vruta",
    images: [
      {
        url: "/favicon/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Vruta logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vruta — Find Your Chavruta. Grow Together.",
    description:
      "Connect with Jewish learners for chavruta study based on shared interests, mutual availability, and location.",
    images: ["/favicon/android-chrome-512x512.png"],
  },
};

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
      <body className="min-h-full flex flex-col">
        <ThemeProvider defaultTheme="system">
          <SessionProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
