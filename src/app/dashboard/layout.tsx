"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/registry/new-york-v4/ui/button";
import { signOut } from "firebase/auth";
import { Skeleton } from "@/registry/new-york-v4/ui/skeleton";
import {
    LayoutDashboard,
    LogOut,
    Bell,
    Settings,
    User,
    AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface User {
    email: string;
    isMock?: boolean;
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    // Dashboard navigation items
    const dashboardNavItems = [
        {
            href: "/dashboard",
            label: "Performance",
            icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
            href: "/dashboard/errors",
            label: "Errors",
            icon: <AlertCircle className="h-5 w-5" />,
        },
    ];

    useEffect(() => {
        // Check for mock user in session storage
        const hasMockUser = sessionStorage.getItem("mockUser") === "true";

        if (hasMockUser) {
            setUser({ email: "admin@admin.com", isMock: true });
            setLoading(false);
            return;
        }

        // If no mock user, check Firebase auth
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            if (!authUser) {
                // Redirect to login if not authenticated
                router.push("/login");
            } else {
                setUser({ email: authUser.email || "No email" });
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    const handleSignOut = async () => {
        try {
            // If using mock user, clear session storage
            if (user?.isMock) {
                sessionStorage.removeItem("mockUser");
                router.push("/login");
                return;
            }

            // Otherwise, sign out from Firebase
            await signOut(auth);
            router.push("/login");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <header className="border-b bg-card shadow-sm">
                    <div className="container mx-auto flex h-16 items-center px-4">
                        <div className="flex-1">
                            <Skeleton className="h-8 w-24" />
                        </div>
                        <nav className="flex items-center gap-4">
                            <Skeleton className="h-8 w-20" />
                        </nav>
                    </div>
                </header>
                <main className="flex-1">
                    <div className="container mx-auto p-6">
                        <Skeleton className="h-8 w-56 mb-6" />
                        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-40" />
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="border-b bg-[#1C4E80] text-white shadow-md">
                <div className="container mx-auto flex h-16 items-center px-4">
                    <div className="flex-1 flex items-center gap-2">
                        <LayoutDashboard className="h-6 w-6" />
                        <h1 className="text-xl font-bold">WatchDash</h1>
                    </div>

                    {/* Dashboard navigation tabs */}
                    <div className="flex-1 flex items-center justify-center gap-6">
                        {dashboardNavItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    flex items-center gap-2 px-3 py-2 rounded-md transition-colors
                                    ${pathname === item.href ? "bg-[#0091D5] text-white font-medium" : "text-white/80 hover:text-white hover:bg-[#0091D5]/30"}
                                `}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    <nav className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-[#0091D5]"
                        >
                            <Bell className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-[#0091D5]"
                            onClick={() => router.push("/dashboard/diagnostic")}
                        >
                            <Settings className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-2 bg-[#0091D5] rounded-full py-1 px-3">
                            <User className="h-4 w-4" />
                            <div className="text-sm font-medium">
                                {user?.email}
                                {user?.isMock && " (Demo)"}
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={handleSignOut}
                            className="text-white hover:bg-[#0091D5] flex items-center gap-1"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </Button>
                    </nav>
                </div>
            </header>
            <main className="flex-1 bg-[#F1F1F1] dark:bg-[#202020]">
                {children}
            </main>
        </div>
    );
}
