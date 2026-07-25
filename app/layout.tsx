import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site-url";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Tidbits — bite-sized trivia",
    template: "%s | Tidbits",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    locale: "en_US",
    title: "Tidbits — bite-sized trivia",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Tidbits — bite-sized trivia to make you smile.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tidbits — bite-sized trivia",
    description: SITE_DESCRIPTION,
    images: ["/twitter-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fredoka.variable} ${nunito.variable} h-full`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const theme = localStorage.getItem("tidbits-theme"); if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme; } catch {} })()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-cream text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
