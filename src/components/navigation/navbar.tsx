"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
    Sun,
    Moon,
    Menu,
    X,
    Search,
    User,
    PlusCircle,
    ShieldAlert,
} from "lucide-react";
import { Button } from "@/registry/new-york-v4/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/registry/new-york-v4/ui/dropdown-menu";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/registry/new-york-v4/ui/avatar";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { AuthModal } from "@/components/auth/auth-modal";

export default function Navbar() {
    const { theme, setTheme } = useTheme();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { user, userData, loading, logout } = useAuth();

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 10) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            router.push("/");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const getInitials = () => {
        if (!userData) return "U";
        if (userData.displayName) {
            return userData.displayName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .substring(0, 2);
        }
        return userData.email ? userData.email[0].toUpperCase() : "U";
    };

    return (
        <>
            <AuthModal
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
            />

            <header
                className={cn(
                    "sticky top-0 z-50 w-full transition-all duration-200",
                    isScrolled
                        ? "bg-background/80 backdrop-blur-sm border-b"
                        : "bg-background",
                )}
            >
                <div className="container flex h-16 items-center">
                    <div className="flex items-center justify-between w-full">
                        {/* Logo and desktop navigation */}
                        <div className="flex items-center gap-6">
                            <Link href="/" className="flex items-center gap-2">
                                <span className="text-xl font-bold">
                                    Ochtarcus
                                </span>
                            </Link>

                            <nav className="hidden md:flex items-center gap-6">
                                <Link
                                    href="/blogs"
                                    className={cn(
                                        "text-sm font-medium transition-colors hover:text-primary",
                                        pathname === "/blogs"
                                            ? "text-foreground"
                                            : "text-muted-foreground",
                                    )}
                                >
                                    Blogs
                                </Link>
                                <Link
                                    href="/videos"
                                    className={cn(
                                        "text-sm font-medium transition-colors hover:text-primary",
                                        pathname === "/videos"
                                            ? "text-foreground"
                                            : "text-muted-foreground",
                                    )}
                                >
                                    Videos
                                </Link>
                            </nav>
                        </div>

                        {/* Right side: search, theme, profile */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsSearchOpen(true)}
                                className="mr-1"
                                aria-label="Search"
                            >
                                <Search className="h-5 w-5" />
                            </Button>

                            {user && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="hidden md:flex items-center gap-1"
                                    onClick={() => router.push("/submit")}
                                >
                                    <PlusCircle className="h-4 w-4" />
                                    <span>Submit Content</span>
                                </Button>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    setTheme(
                                        theme === "dark" ? "light" : "dark",
                                    )
                                }
                                aria-label="Toggle theme"
                            >
                                {theme === "dark" ? (
                                    <Sun className="h-5 w-5" />
                                ) : (
                                    <Moon className="h-5 w-5" />
                                )}
                            </Button>

                            {loading ? (
                                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                            ) : user ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-full h-8 w-8 p-0"
                                        >
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage
                                                    src={
                                                        userData?.photoURL ||
                                                        undefined
                                                    }
                                                    alt={
                                                        userData?.displayName ||
                                                        "User"
                                                    }
                                                />
                                                <AvatarFallback>
                                                    {getInitials()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>
                                            {userData?.displayName || "Account"}
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() =>
                                                router.push("/profile")
                                            }
                                        >
                                            <User className="mr-2 h-4 w-4" />
                                            <span>Profile</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                router.push(
                                                    "/profile/bookmarks",
                                                )
                                            }
                                        >
                                            <span>Bookmarks</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                router.push("/profile/history")
                                            }
                                        >
                                            <span>History</span>
                                        </DropdownMenuItem>
                                        {userData?.isAdmin && (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    router.push(
                                                        "/admin/dashboard",
                                                    )
                                                }
                                            >
                                                <ShieldAlert className="mr-2 h-4 w-4 text-primary" />
                                                <span>Admin Dashboard</span>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={handleLogout}
                                        >
                                            <span>Sign out</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAuthModalOpen(true)}
                                >
                                    Sign In
                                </Button>
                            )}

                            {/* Admin Quick Access Button */}
                            {user && userData?.isAdmin && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="hidden md:flex items-center gap-1 border-primary/30 text-primary hover:bg-primary/10"
                                    onClick={() =>
                                        router.push("/admin/dashboard")
                                    }
                                >
                                    <ShieldAlert className="h-4 w-4" />
                                    <span>Admin</span>
                                </Button>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden"
                                onClick={() => setIsMobileMenuOpen(true)}
                                aria-label="Open menu"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile menu */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 bg-background md:hidden">
                    <div className="container h-full flex flex-col">
                        <div className="flex items-center justify-between h-16">
                            <Link href="/" className="flex items-center gap-2">
                                <span className="text-xl font-bold">
                                    Ochtarcus
                                </span>
                            </Link>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsMobileMenuOpen(false)}
                                aria-label="Close menu"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <nav className="flex flex-col gap-4 mt-8">
                            <Link
                                href="/blogs"
                                className="text-lg font-medium py-2"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Blogs
                            </Link>
                            <Link
                                href="/videos"
                                className="text-lg font-medium py-2"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Videos
                            </Link>
                            {user && (
                                <Link
                                    href="/submit"
                                    className="text-lg font-medium py-2"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Submit Content
                                </Link>
                            )}
                            {user && userData?.isAdmin && (
                                <Link
                                    href="/admin/dashboard"
                                    className="text-lg font-medium py-2 text-primary flex items-center gap-2"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <ShieldAlert className="h-5 w-5" />
                                    Admin Dashboard
                                </Link>
                            )}
                            {!user && (
                                <Button
                                    variant="default"
                                    size="lg"
                                    className="mt-4"
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        setAuthModalOpen(true);
                                    }}
                                >
                                    Sign In
                                </Button>
                            )}
                        </nav>
                    </div>
                </div>
            )}

            {/* Search overlay */}
            {isSearchOpen && (
                <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
                    <div className="container pt-16 pb-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold">Search</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsSearchOpen(false)}
                                aria-label="Close search"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="max-w-2xl mx-auto">
                            <div className="mb-8">
                                <input
                                    type="text"
                                    placeholder="Search for blogs, videos, and more..."
                                    className="w-full px-4 py-3 text-lg border rounded-md bg-background"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-4">
                                {/* Search results would go here */}
                                <p className="text-center text-muted-foreground">
                                    Try searching for a topic, keyword, or
                                    phrase
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
