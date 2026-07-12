import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "살아보고 · SARABOGO",
  description: "살아본 사람에게 묻고, 나에게 맞게 떠난다 — 시니어 지역살이 플랫폼",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1f6f54",
  width: "device-width",
  initialScale: 1,
  // 시니어 접근성: 사용자 확대를 막지 않는다.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
