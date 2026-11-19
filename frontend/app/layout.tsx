import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { ShellWrapper } from "@/components/shell/ShellWrapper";

const inter = Inter({ subsets: ["latin"] });

// The theme tokens in globals.css are bare HSL channels, so they need hsl() here.
const clerkAppearance = {
  variables: {
    colorBackground: "hsl(var(--card))",
    colorForeground: "hsl(var(--card-foreground))",
    colorNeutral: "hsl(var(--foreground))",
    colorPrimary: "hsl(var(--primary))",
    colorPrimaryForeground: "hsl(var(--primary-foreground))",
    colorMuted: "hsl(var(--muted))",
    colorMutedForeground: "hsl(var(--muted-foreground))",
    colorInput: "hsl(var(--muted))",
    colorInputForeground: "hsl(var(--card-foreground))",
    colorDanger: "hsl(var(--destructive))",
    colorRing: "hsl(var(--ring))",
    borderRadius: "var(--radius)",
  },
};

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
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}})();`
        }} />
      </head>
      <body className={inter.className}>
        <ClerkProvider appearance={clerkAppearance} afterSignOutUrl="/">
          <AppProviders>
            <ShellWrapper>{children}</ShellWrapper>
          </AppProviders>
        </ClerkProvider>
      </body>
    </html>
  );
}