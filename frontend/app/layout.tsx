import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import { Toaster } from "sonner";

import { AuthProvider } from "@/components/providers/auth-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI Recruiter",
    template: "%s | AI Recruiter",
  },
  description:
    "Enterprise-grade AI Recruitment Intelligence Platform for document intake, candidate intelligence, AI chat, JD matching, and Smart JD generation.",
  metadataBase: new URL("https://talentcore.ai"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            className:
              "!border !border-slate-200 !bg-white !text-slate-950 !shadow-[0_18px_40px_rgba(15,23,42,0.08)]",
          }}
        />
      </body>
    </html>
  );
}
