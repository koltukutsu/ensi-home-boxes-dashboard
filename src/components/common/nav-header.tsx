"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Menu,
    X,
    BookOpen,
    Search,
    Info,
    ChevronRight,
    Home,
    LogIn,
    PlusCircle,
    ShieldAlert,
    Sparkles,
    Zap,
    CreditCard,
    Laptop,
    Monitor,
    LayoutDashboard,
    AlertCircle,
    BarChart4,
    ChevronDown,
} from "lucide-react";

import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
} from "@/registry/new-york-v4/ui/navigation-menu";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/registry/new-york-v4/ui/sheet";
import { Button } from "@/registry/new-york-v4/ui/button";
import { Separator } from "@/registry/new-york-v4/ui/separator";
import { ModeToggle } from "./mode-toggle";
import { motion, AnimatePresence } from "framer-motion";
import { AuthModal } from "@/components/auth/auth-modal";
import { UserProfileMenu } from "@/components/auth/user-profile-menu";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/registry/new-york-v4/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/registry/new-york-v4/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/registry/new-york-v4/ui/popover";

export function NavHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const { user, loading, userData } = useAuth();
    const [dashboardPopoverOpen, setDashboardPopoverOpen] = useState(false);

    const navItems = [
        {
            href: "/library",
            label: "Library",
            icon: <BookOpen className="h-5 w-5" />,
        },
        {
            href: "/ai-chat",
            label: "AI Search",
            icon: <Sparkles className="h-5 w-5" />,
            isPremium: true,
        },
        {
            href: "/dashboard/device",
            label: "Devices",
            icon: <Monitor className="h-5 w-5" />,
        },
        {
            href: "/about-us",
            label: "About Us",
            icon: <Info className="h-5 w-5" />,
        },
        {
            href: "/subscribe",
            label: "Subscribe",
            icon: <CreditCard className="h-5 w-5" />,
        },
    ];

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

    // Check if user has premium access
    const hasPremiumAccess =
        userData?.subscriptionTier === "pro" ||
        userData?.subscriptionTier === "enterprise";
    // Don't show premium upgrade for admins or users with premium access
    const shouldShowPremiumUpgrade = !hasPremiumAccess && !userData?.isAdmin;

    // Check if we're in a device page
    const isDevicePage = pathname.includes("/dashboard/device");
    // Check if we're in the dashboard section
    const isDashboardPage = pathname.includes("/dashboard");

    return (
        <>
            <AuthModal
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
            />

            <div className="w-full flex items-center justify-between px-3 sm:px-6 md:px-8 lg:px-16 xl:px-24 2xl:px-48 py-3 sm:py-4 border-b relative bg-background/90 backdrop-blur-sm sticky top-0 z-50">
                {/* Logo */}
                <Link
                    href="/"
                    className="flex items-center gap-1.5 sm:gap-2 z-20"
                >
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary flex items-center justify-center rounded-sm">
                        <span className="text-[#f5f5ee] font-bold text-xs sm:text-base">
                            O
                        </span>
                    </div>
                    <span className="text-sm sm:text-xl font-bold text-primary">
                        Ochtarcus
                    </span>
                </Link>

                {/* Dashboard Button with Dropdown/Drawer - hide when inside dashboard pages */}
                {false && isDashboardPage && (
                    <div className="absolute left-1/2 transform -translate-x-1/2">
                        <div className="hidden md:block">
                            <Popover
                                open={dashboardPopoverOpen}
                                onOpenChange={setDashboardPopoverOpen}
                            >
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="flex items-center gap-2 px-3 py-2"
                                    >
                                        <BarChart4 className="h-4 w-4" />
                                        <span>Dashboard</span>
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-2">
                                    <div className="flex flex-col space-y-1">
                                        {dashboardNavItems.map((item) => (
                                            <Button
                                                key={item.href}
                                                variant="ghost"
                                                className={`justify-start gap-2 ${
                                                    pathname === item.href
                                                        ? "bg-primary/10 text-primary font-medium"
                                                        : ""
                                                }`}
                                                asChild
                                            >
                                                <Link
                                                    href={item.href}
                                                    onClick={() =>
                                                        setDashboardPopoverOpen(
                                                            false,
                                                        )
                                                    }
                                                >
                                                    {item.icon}
                                                    <span>{item.label}</span>
                                                </Link>
                                            </Button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="md:hidden">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center gap-2"
                                    >
                                        <BarChart4 className="h-4 w-4" />
                                        <span>Dashboard</span>
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="top" className="pt-12">
                                    <div className="flex flex-col space-y-4">
                                        <h3 className="font-medium">
                                            Dashboard Navigation
                                        </h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            {dashboardNavItems.map((item) => (
                                                <Button
                                                    key={item.href}
                                                    variant={
                                                        pathname === item.href
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    className="w-full justify-start gap-2"
                                                    asChild
                                                >
                                                    <Link href={item.href}>
                                                        {item.icon}
                                                        <span>
                                                            {item.label}
                                                        </span>
                                                    </Link>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                )}

                {/* Desktop Navigation */}
                <div className="hidden sm:hidden md:flex items-center gap-2 lg:gap-4">
                    <NavigationMenu>
                        <NavigationMenuList className="gap-3 lg:gap-6 *:data-[slot=navigation-menu-item]:h-7 **:data-[slot=navigation-menu-link]:py-1 **:data-[slot=navigation-menu-link]:font-medium">
                            {navItems.map((item) => (
                                <NavigationMenuItem key={item.href}>
                                    <NavigationMenuLink
                                        asChild
                                        data-active={
                                            pathname === item.href ||
                                            (item.href ===
                                                "/dashboard/device" &&
                                                isDevicePage)
                                        }
                                        className={`relative transition-colors hover:text-primary`}
                                    >
                                        <Link
                                            href={item.href}
                                            className="flex items-center gap-1.5"
                                        >
                                            {item.label}
                                            {item.isPremium && (
                                                <Badge className="px-1.5 py-0 bg-primary/20 text-primary text-[10px] font-medium border-0">
                                                    PRO
                                                </Badge>
                                            )}
                                        </Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            ))}
                        </NavigationMenuList>
                    </NavigationMenu>
                    <div className="flex items-center gap-1 lg:gap-2">
                        {!loading && user ? (
                            <>
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="gap-1"
                                    asChild
                                >
                                    <Link href="/submit">
                                        <PlusCircle className="h-4 w-4" />
                                        <span>Submit</span>
                                    </Link>
                                </Button>
                                {shouldShowPremiumUpgrade && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1 border-primary text-primary bg-primary/5 hover:bg-primary/10"
                                        asChild
                                    >
                                        <Link href="/subscribe">
                                            <Zap className="h-4 w-4" />
                                            <span>Upgrade</span>
                                        </Link>
                                    </Button>
                                )}
                            </>
                        ) : (
                            !loading && (
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => setAuthModalOpen(true)}
                                >
                                    <LogIn className="h-4 w-4" />
                                    <span>Sign In</span>
                                </Button>
                            )
                        )}
                        {!loading && user && userData?.isAdmin && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="relative p-0 h-8 w-8 rounded-full border-2 border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20"
                                            asChild
                                        >
                                            <Link href="/admin/dashboard">
                                                <ShieldAlert className="h-4 w-4 text-amber-600" />
                                                <span className="sr-only">
                                                    Admin Dashboard
                                                </span>
                                            </Link>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-xs">
                                            Admin Dashboard
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <ModeToggle />
                        {!loading && user && <UserProfileMenu />}
                    </div>
                </div>

                {/* Mobile Navigation */}
                <div className="flex sm:flex md:hidden items-center gap-1.5 sm:gap-3">
                    {!loading && user ? (
                        <>
                            <Button
                                variant="default"
                                size="icon"
                                className="h-8 w-8 p-0"
                                asChild
                            >
                                <Link href="/submit">
                                    <PlusCircle className="h-4 w-4" />
                                    <span className="sr-only">Submit</span>
                                </Link>
                            </Button>
                            {shouldShowPremiumUpgrade && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 p-0 border-primary text-primary bg-primary/5"
                                    asChild
                                >
                                    <Link href="/subscribe">
                                        <Zap className="h-4 w-4" />
                                        <span className="sr-only">Upgrade</span>
                                    </Link>
                                </Button>
                            )}
                        </>
                    ) : (
                        !loading && (
                            <Button
                                variant="default"
                                size="icon"
                                className="h-8 w-8 p-0"
                                onClick={() => setAuthModalOpen(true)}
                            >
                                <LogIn className="h-4 w-4" />
                                <span className="sr-only">Sign In</span>
                            </Button>
                        )
                    )}
                    <ModeToggle />
                    {!loading && user && <UserProfileMenu />}
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 p-0 relative"
                            >
                                {!loading && user && userData?.isAdmin && (
                                    <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-amber-500 ring-1 ring-white" />
                                )}
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent
                            side="right"
                            className="w-[80vw] sm:w-[350px] p-0 border-l-primary/20"
                        >
                            {/* Header section with logo and close button */}
                            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b">
                                <div className="flex items-center justify-between p-4">
                                    <Link
                                        href="/"
                                        className="flex items-center gap-2"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <div className="w-8 h-8 bg-primary flex items-center justify-center rounded-sm">
                                            <span className="text-[#f5f5ee] font-bold">
                                                O
                                            </span>
                                        </div>
                                        <span className="text-xl font-bold text-primary">
                                            Ochtarcus
                                        </span>
                                    </Link>
                                    {!loading && user && userData?.isAdmin && (
                                        <Badge
                                            variant="outline"
                                            className="mr-2 px-2 py-0 text-xs bg-amber-500/10 text-amber-600 border-amber-200/50"
                                        >
                                            Admin
                                        </Badge>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 p-0 hover:bg-primary/10 transition-colors"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <X className="h-5 w-5" />
                                        <span className="sr-only">
                                            Close menu
                                        </span>
                                    </Button>
                                </div>
                            </div>

                            {/* Navigation items */}
                            <div className="px-4 py-4 sm:py-6 flex flex-col">
                                {/* Add Dashboard Navigation if on dashboard pages - only in mobile drawer */}
                                {isDashboardPage && (
                                    <>
                                        <div className="mb-1 ml-1 text-xs uppercase text-muted-foreground font-medium tracking-wide">
                                            Dashboard
                                        </div>
                                        <Separator className="mb-4" />
                                        <div className="flex flex-col space-y-1 mb-6">
                                            {dashboardNavItems.map(
                                                (item, index) => (
                                                    <motion.div
                                                        key={item.href}
                                                        initial={{
                                                            opacity: 0,
                                                            x: -10,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            x: 0,
                                                        }}
                                                        transition={{
                                                            duration: 0.2,
                                                            delay: index * 0.05,
                                                        }}
                                                    >
                                                        <Link
                                                            href={item.href}
                                                            className={`
                                                            flex items-center justify-between p-2.5 sm:p-3 rounded-md 
                                                            transition-all duration-200 
                                                            ${
                                                                pathname ===
                                                                item.href
                                                                    ? "bg-primary/10 text-primary font-medium"
                                                                    : "text-foreground hover:bg-muted"
                                                            }
                                                        `}
                                                            onClick={() =>
                                                                setIsOpen(false)
                                                            }
                                                        >
                                                            <div className="flex items-center gap-2 sm:gap-3">
                                                                <span
                                                                    className={
                                                                        pathname ===
                                                                        item.href
                                                                            ? "text-primary"
                                                                            : "text-muted-foreground"
                                                                    }
                                                                >
                                                                    {item.icon}
                                                                </span>
                                                                <span>
                                                                    {item.label}
                                                                </span>
                                                            </div>
                                                            <ChevronRight
                                                                className={`h-4 w-4 transition-transform ${pathname === item.href ? "text-primary opacity-100" : "opacity-60"}`}
                                                            />
                                                        </Link>
                                                    </motion.div>
                                                ),
                                            )}
                                        </div>
                                    </>
                                )}

                                <div className="mb-1 ml-1 text-xs uppercase text-muted-foreground font-medium tracking-wide">
                                    Navigation
                                </div>
                                <Separator className="mb-4" />

                                {/* Menu items with animations */}
                                <div className="flex flex-col space-y-0.5 sm:space-y-1">
                                    {navItems.map((item, index) => (
                                        <motion.div
                                            key={item.href}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                                duration: 0.2,
                                                delay: index * 0.05,
                                            }}
                                        >
                                            <Link
                                                href={item.href}
                                                className={`
                                                    flex items-center justify-between p-2.5 sm:p-3 rounded-md 
                                                    transition-all duration-200 
                                                    ${
                                                        pathname ===
                                                            item.href ||
                                                        (item.href ===
                                                            "/dashboard/device" &&
                                                            isDevicePage)
                                                            ? "bg-primary/10 text-primary font-medium"
                                                            : "text-foreground hover:bg-muted"
                                                    }
                                                `}
                                                onClick={() => setIsOpen(false)}
                                            >
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    <span
                                                        className={
                                                            pathname ===
                                                                item.href ||
                                                            (item.href ===
                                                                "/dashboard/device" &&
                                                                isDevicePage)
                                                                ? "text-primary"
                                                                : "text-muted-foreground"
                                                        }
                                                    >
                                                        {item.icon}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span>
                                                            {item.label}
                                                        </span>
                                                        {item.isPremium && (
                                                            <Badge className="px-1.5 py-0 bg-primary/20 text-primary text-[10px] font-medium border-0">
                                                                PRO
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight
                                                    className={`h-4 w-4 transition-transform ${pathname === item.href || (item.href === "/dashboard/device" && isDevicePage) ? "text-primary opacity-100" : "opacity-60"}`}
                                                />
                                            </Link>
                                        </motion.div>
                                    ))}

                                    {/* Submit Content button in mobile drawer */}
                                    {!loading && user && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                                duration: 0.2,
                                                delay: navItems.length * 0.05,
                                            }}
                                        >
                                            <Link
                                                href="/submit"
                                                className={`
                                                    flex items-center justify-between p-2.5 sm:p-3 rounded-md 
                                                    transition-all duration-200 
                                                    ${
                                                        pathname === "/submit"
                                                            ? "bg-primary/10 text-primary font-medium"
                                                            : "text-foreground hover:bg-muted"
                                                    }
                                                `}
                                                onClick={() => setIsOpen(false)}
                                            >
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    <span
                                                        className={
                                                            pathname ===
                                                            "/submit"
                                                                ? "text-primary"
                                                                : "text-muted-foreground"
                                                        }
                                                    >
                                                        <PlusCircle className="h-5 w-5" />
                                                    </span>
                                                    <span>Submit Content</span>
                                                </div>
                                                <ChevronRight
                                                    className={`h-4 w-4 transition-transform ${pathname === "/submit" ? "text-primary opacity-100" : "opacity-60"}`}
                                                />
                                            </Link>
                                        </motion.div>
                                    )}

                                    {/* Pricing/Upgrade link */}
                                    {!loading &&
                                        user &&
                                        shouldShowPremiumUpgrade && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{
                                                    duration: 0.2,
                                                    delay:
                                                        navItems.length * 0.05 +
                                                        0.1,
                                                }}
                                            >
                                                <Link
                                                    href="/subscribe"
                                                    className={`
                                                    flex items-center justify-between p-2.5 sm:p-3 rounded-md 
                                                    transition-all duration-200 
                                                    ${
                                                        pathname ===
                                                        "/subscribe"
                                                            ? "bg-primary/10 text-primary font-medium"
                                                            : "text-foreground hover:bg-muted"
                                                    }
                                                `}
                                                    onClick={() =>
                                                        setIsOpen(false)
                                                    }
                                                >
                                                    <div className="flex items-center gap-2 sm:gap-3">
                                                        <span
                                                            className={
                                                                pathname ===
                                                                "/subscribe"
                                                                    ? "text-primary"
                                                                    : "text-muted-foreground"
                                                            }
                                                        >
                                                            <Zap className="h-5 w-5" />
                                                        </span>
                                                        <span>
                                                            Upgrade to Premium
                                                        </span>
                                                    </div>
                                                    <ChevronRight
                                                        className={`h-4 w-4 transition-transform ${pathname === "/subscribe" ? "text-primary opacity-100" : "opacity-60"}`}
                                                    />
                                                </Link>
                                            </motion.div>
                                        )}

                                    {/* Admin Dashboard link in mobile drawer */}
                                    {!loading && user && userData?.isAdmin && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                                duration: 0.2,
                                                delay:
                                                    (navItems.length + 1) *
                                                        0.05 +
                                                    0.1,
                                            }}
                                        >
                                            <Link
                                                href="/admin/dashboard"
                                                className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 text-amber-700"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                <ShieldAlert className="h-4 w-4 text-amber-600" />
                                                <span className="text-sm">
                                                    Admin
                                                </span>
                                            </Link>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* User account section */}
                            {!loading && !user && (
                                <div className="px-4 py-3 sm:py-4 border-t">
                                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                                        Create an account to access AI-powered
                                        knowledge & exclusive features
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            className="w-full justify-center gap-2 bg-primary text-white hover:bg-primary/90"
                                            onClick={() => {
                                                setIsOpen(false);
                                                setAuthModalOpen(true);
                                            }}
                                        >
                                            <LogIn className="h-4 w-4" />
                                            <span>Sign In</span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-center gap-2"
                                            onClick={() => {
                                                setIsOpen(false);
                                                router.push("/subscribe");
                                            }}
                                        >
                                            View Pricing
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Footer with brand info */}
                            <div className="mt-auto border-t px-4 py-4 sm:py-6">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center opacity-80">
                                        <div className="text-sm text-muted-foreground">
                                            <p className="mb-1 text-xs uppercase text-muted-foreground font-medium tracking-wide">
                                                Ochtarcus
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Many arms, one mind
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </>
    );
}
