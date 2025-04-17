import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import "@/app/globals.css";
import { Toaster } from "@/registry/new-york-v4/ui/sonner";

// Define the viewport configuration
export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#f5f5ee" },
        { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    ],
    width: "device-width",
    initialScale: 1,
    maximumScale: 1.5,
};

export const metadata: Metadata = {
    title: {
        default: "WatchDash",
        template: "%s | WatchDash",
    },
    description: "Real-time monitoring dashboard for system connectivity",
    keywords: [
        "connectivity",
        "dashboard",
        "monitoring",
        "realtime",
        "firebase",
    ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head />
            <body className="bg-background text-foreground antialiased">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <main className="min-h-screen">{children}</main>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
