import type { Metadata } from "next";
import { DojoAppShell } from "@/components/DojoAppShell";

export const metadata: Metadata = {
  title: "LLM Dojo: AI engineering course and interview prep",
  description:
    "Learn LLM and AI engineering through interactive lessons, visual labs, and real interview questions.",
  icons: {
    icon: "/icon.svg",
  },
};

const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/dojo.css" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground antialiased">
        <DojoAppShell>{children}</DojoAppShell>
      </body>
    </html>
  );
}
