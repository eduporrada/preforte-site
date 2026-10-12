import type { Metadata } from "next";
import { headers } from "next/headers";
import "./preforte-apple-interface.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const title = "Preforte — Gestão de Engenharia";
  const description =
    "Projetos, finanças e gestão de obras da Preforte em um só lugar.";

  return {
    metadataBase: base,
    title,
    description,
    manifest: "/manifest.webmanifest",
    themeColor: "#F5F5F7",
    appleWebApp: {
      capable: true,
      title: "Preforte",
      statusBarStyle: "default",
    },
    icons: {
      icon: [
        { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icon-180.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: new URL("/og.png", base), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL("/og.png", base)],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
