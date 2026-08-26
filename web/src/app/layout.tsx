import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Header } from "@/components/Header";
import { ChatFAB } from "@/components/ChatFAB";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import "@/styles/globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vitals — Financial Health",
  description: "Know your financial health score in minutes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} font-sans min-h-screen`}>
        <AnalyticsProvider />
        <Header />
        <main>{children}</main>
        <ChatFAB />
      </body>
    </html>
  );
}
