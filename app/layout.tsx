import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrackVitals",
  description: "Aplicación para seguimiento clínico de diabetes"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14B8A6"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
