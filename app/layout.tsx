import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kart Takip",
  description: "Kredi karti borc ve odeme takip paneli",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full">
      <body>{children}</body>
    </html>
  );
}
