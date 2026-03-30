import type { Metadata } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/syne/600.css";
import "@fontsource/syne/700.css";
import { Toaster } from "sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TalentCore AI",
    template: "%s | TalentCore AI"
  },
  description:
    "Enterprise-grade AI Recruitment Intelligence Platform for document intake, candidate intelligence, AI chat, JD matching, and Smart JD generation.",
  metadataBase: new URL("https://talentcore.ai")
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            className: "!border-white/10 !bg-[#10131a] !text-white !shadow-[0_0_50px_rgba(108,99,255,0.2)]"
          }}
        />
      </body>
    </html>
  );
}
