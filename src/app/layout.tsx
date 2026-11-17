import type { Metadata, Viewport } from "next";
import { Fira_Sans, Fira_Code } from "next/font/google";
import "./globals.css";
import RealtimeSync from "@/components/RealtimeSync";
import Sidebar from "@/components/Sidebar";
import DevServiceWorkerCleanup from "@/components/DevServiceWorkerCleanup";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Smart Landlord OS",
    template: "%s | Smart Landlord OS",
  },
  description:
    "Progressive web app for rental property management, automated Nepali utility billing & expense tracking.",
  manifest: "/manifest.json",
  applicationName: "Landlord OS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "Landlord OS",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f766e" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored === 'dark' || (!stored && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${firaSans.variable} ${firaCode.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans bg-slate-50 text-slate-900 min-h-screen antialiased selection:bg-teal-500/25">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-teal-700 focus:text-white focus:text-xs focus:font-bold focus:shadow-lg"
        >
          Skip to main content
        </a>
        <RealtimeSync />
        <DevServiceWorkerCleanup />
        {/* App Shell: sidebar + main content */}
        <div className="flex min-h-screen">
          <Sidebar />
          {/* Main content — offset for mobile top bar */}
          <main
            id="main-content"
            className="flex-1 min-w-0 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] lg:pt-0 overflow-x-hidden"
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
