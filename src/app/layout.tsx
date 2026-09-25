import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { THEME_SCRIPT } from "@/client/theme";
import "./globals.css";

// DESIGN-BRIEF.md §1. next/font serves them from our own domain, so the browser
// never contacts Google for them.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RevCode",
  description: "NeetCode 250 revision tracker with spaced repetition and notes",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script sets `data-theme` on <html> before React loads, so that one
    // attribute is expected to differ from the server's HTML.
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* A plain script in <head> runs before the first paint, so a saved theme never
            flashes the other one first. (next/script's beforeInteractive would run it
            only once Next's own code starts.) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* Browser extensions (e.g. Grammarly) add attributes to <body> before React loads.
          This ignores those attribute differences on <body> only, not on its children. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
