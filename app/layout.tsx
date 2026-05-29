import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://voyago-eta.vercel.app"),
  title: {
    default: "Voyago — Le voyage qui te ressemble",
    template: "%s | Voyago",
  },
  description:
    "Vols, hébergements et activités sur-mesure pour ton groupe : famille, couple ou en solo.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://voyago-eta.vercel.app",
    siteName: "Voyago",
    title: "Voyago — Le voyage qui te ressemble",
    description:
      "Vols, hébergements et activités sur-mesure pour ton groupe : famille, couple ou en solo.",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Voyago — Le voyage qui te ressemble",
    description:
      "Vols, hébergements et activités sur-mesure pour ton groupe : famille, couple ou en solo.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
