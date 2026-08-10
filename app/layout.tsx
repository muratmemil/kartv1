import type { Metadata } from "next";
import "./globals.css";
import "../public/vendor/tabler/tabler.min.css";
import "../public/vendor/tabler/tabler-vendors.min.css";

export const metadata: Metadata = {
  title: "Kart Takip",
  description: "Kredi karti borc ve odeme takip paneli",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full">
      <body className="theme-light">{children}</body>
    </html>
  );
}
