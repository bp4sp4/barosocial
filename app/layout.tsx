import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../styles/base.css";
import "../styles/layout.css";
import "../styles/components.css";
import Footer from "./components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "한평생교육 무료상담",
  description: "한평생교육 무료상담",
  openGraph: {
    title: "한평생교육 무료상담",
    description: "한평생교육 무료상담",
    images: [
      {
        url: "/og-image.png",
        width: 800,
        height: 540,
        alt: "한평생교육 무료상담",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "한평생교육 무료상담",
    description: "한평생교육 무료상담",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Footer />
        {/* 당근마켓 전환 추적 코드 (사회복지사 · ID 1788494140410716001) */}
        <Script id="karrot-pixel" strategy="afterInteractive">
          {`(function (w, d) {
  if (w.karrotPixel) return;
  var k = { stub: true, queue: [] };
  k.init = function () { k.queue.push(['init', arguments, Date.now()]); };
  k.track = function () { k.queue.push(['track', arguments, Date.now()]); };
  w.karrotPixel = k;
  var s = d.createElement('script');
  s.async = true;
  s.src = 'https://karrot-pixel.business.daangn.com/karrot-pixel.js';
  var f = d.getElementsByTagName('script')[0];
  f && f.parentNode ? f.parentNode.insertBefore(s, f) : d.head.appendChild(s);
})(window, document);
window.karrotPixel.init('1788494140410716001');
window.karrotPixel.track('ViewPage');`}
        </Script>
      </body>
    </html>
  );
}
