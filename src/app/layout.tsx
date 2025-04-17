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
    title: "WatchDash by Solace | Centralized Monitoring Solution",
    description:
        "WatchDash operates as a centralized monitoring solution with decentralized control capabilities, connecting teams with shared information across devices and systems.",
    keywords: [
        "monitoring",
        "dashboard",
        "solace",
        "devices",
        "metrics",
        "visibility",
    ],
    authors: [{ name: "Solace" }],
    openGraph: {
        title: "WatchDash by Solace | Centralized Monitoring Solution",
        description:
            "WatchDash is not just a dashboard — it is a model for how technical monitoring can be structured: many systems, one view.",
        images: ["/images/banner.png"],
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "WatchDash by Solace",
        description:
            "Strategic visibility into multiple system components with decentralized monitoring and unified intelligence.",
        images: ["/images/banner.png"],
    },
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
