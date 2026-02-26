import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CareerCore",
  description: "Your career foundation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Sidebar />
        <Header />
        <main className="ml-[260px] pt-14 min-h-screen bg-background">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
