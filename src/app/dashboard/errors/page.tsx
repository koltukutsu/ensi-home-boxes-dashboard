"use client";

import React, { useEffect, useState } from "react";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/registry/new-york-v4/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/registry/new-york-v4/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/registry/new-york-v4/ui/card";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/registry/new-york-v4/ui/alert";
import {
    AlertCircle,
    RefreshCw,
    Search,
    ArrowUpDown,
    Filter,
    X,
    CheckCircle2,
    Clock,
    XCircle,
    BarChart2,
    ChartPie,
    TrendingUp,
    ListFilter,
    Calendar,
    LineChart,
    PieChart,
    BarChart,
    Activity,
} from "lucide-react";
import { Button } from "@/registry/new-york-v4/ui/button";
import { Badge } from "@/registry/new-york-v4/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/registry/new-york-v4/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/registry/new-york-v4/ui/select";
import { Input } from "@/registry/new-york-v4/ui/input";
import { Label } from "@/registry/new-york-v4/ui/label";
import { Separator } from "@/registry/new-york-v4/ui/separator";
import {
    ErrorService,
    ErrorCategory,
    BaseErrorData,
} from "@/lib/error-service";
import { formatDistanceToNow, subDays, format, subMonths } from "date-fns";
import {
    doc,
    updateDoc,
    collection,
    query,
    orderBy,
    getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

// New interface for statistics
interface ErrorStatistics {
    totalCount: number;
    byStatus: {
        pending: number;
        in_progress: number;
        resolved: number;
        failure: number;
        other: number;
    };
    mostCommonTypes: {
        type: string;
        count: number;
    }[];
    recentTrend: {
        date: string;
        count: number;
    }[];
    avgResolutionTime?: number; // in hours (for resolved errors)
}

// All time statistics interface that combines data from all categories
interface AllTimeStatistics {
    totalErrors: number;
    byCategoryCount: {
        [key in ErrorCategory]: number;
    };
    byCategoryAndStatus: {
        [key in ErrorCategory]: {
            pending: number;
            in_progress: number;
            resolved: number;
            failure: number;
            other: number;
        };
    };
    mostCommonErrorTypes: {
        type: string;
        count: number;
        category: ErrorCategory;
    }[];
    monthlyTrend: {
        month: string;
        user_errors: number;
        house_user_errors: number;
        general_errors: number;
        authentication_errors: number;
    }[];
    avgResolutionTimeByCategory: {
        [key in ErrorCategory]: number | null;
    };
    errorDistributionByDay: {
        dayOfWeek: string;
        count: number;
    }[];
    resolvedVsUnresolved: {
        resolved: number;
        unresolved: number;
    };
}

type SortDirection = "asc" | "desc";
type SortField = "errorType" | "errorMessage" | "status" | "timestamp";
type TabView = "list" | "statistics";

export default function ErrorsPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] =
        useState<ErrorCategory>("user_errors");
    const [activeView, setActiveView] = useState<TabView>("list");

    // All Time Statistics states
    const [allTimeStatsDialogOpen, setAllTimeStatsDialogOpen] = useState(false);
    const [allTimeStats, setAllTimeStats] = useState<AllTimeStatistics | null>(
        null,
    );
    const [loadingAllTimeStats, setLoadingAllTimeStats] = useState(false);

    // State for each error category
    const [userErrors, setUserErrors] = useState<BaseErrorData[]>([]);
    const [houseUserErrors, setHouseUserErrors] = useState<BaseErrorData[]>([]);
    const [generalErrors, setGeneralErrors] = useState<BaseErrorData[]>([]);
    const [authErrors, setAuthErrors] = useState<BaseErrorData[]>([]);

    // Search, sort, and filter states
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<SortField>("timestamp");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Detail dialog states
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedError, setSelectedError] = useState<BaseErrorData | null>(
        null,
    );
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Handle subscription cleanup
    useEffect(() => {
        const unsubscribeUsers = ErrorService.subscribeToErrors(
            "user_errors",
            (errors) => {
                setUserErrors(errors);
                if (loading) setLoading(false);
            },
        );

        const unsubscribeHouseUsers = ErrorService.subscribeToErrors(
            "house_user_errors",
            (errors) => {
                setHouseUserErrors(errors);
                if (loading) setLoading(false);
            },
        );

        const unsubscribeGeneral = ErrorService.subscribeToErrors(
            "general_errors",
            (errors) => {
                setGeneralErrors(errors);
                if (loading) setLoading(false);
            },
        );

        const unsubscribeAuth = ErrorService.subscribeToErrors(
            "authentication_errors",
            (errors) => {
                setAuthErrors(errors);
                if (loading) setLoading(false);
            },
        );

        return () => {
            unsubscribeUsers();
            unsubscribeHouseUsers();
            unsubscribeGeneral();
            unsubscribeAuth();
        };
    }, [loading]);

    // Handle manual refresh
    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            // The real-time listeners will handle the refresh
            setTimeout(() => setRefreshing(false), 1000);
        } catch (err) {
            setError(
                `Failed to refresh data: ${err instanceof Error ? err.message : String(err)}`,
            );
            setRefreshing(false);
        }
    };

    // Open detail dialog with selected error
    const handleRowClick = (error: BaseErrorData) => {
        setSelectedError(error);
        setDetailDialogOpen(true);
    };

    // Update error status in Firebase
    const updateErrorStatus = async (newStatus: string) => {
        if (!selectedError) return;

        setUpdatingStatus(true);
        try {
            // Reference to the error document
            const errorRef = doc(
                db,
                "logs",
                activeCategory,
                "errors",
                selectedError.id,
            );

            // Update the status field
            await updateDoc(errorRef, {
                status: newStatus,
            });

            // Update the local state
            setSelectedError({
                ...selectedError,
                status: newStatus,
            });

            toast.success(`Status updated to ${newStatus}`);
        } catch (err) {
            console.error("Failed to update status:", err);
            toast.error(
                `Failed to update status: ${err instanceof Error ? err.message : String(err)}`,
            );
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Format timestamp for display
    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return "N/A";
        try {
            const date = timestamp.toDate
                ? timestamp.toDate()
                : new Date(timestamp);
            return formatDistanceToNow(date, { addSuffix: true });
        } catch (err) {
            return "Invalid date";
        }
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case "pending":
                return (
                    <Badge className="bg-yellow-200 text-yellow-800 hover:bg-yellow-300 border-yellow-300">
                        Pending
                    </Badge>
                );
            case "resolved":
            case "solved":
                return (
                    <Badge className="bg-green-200 text-green-800 hover:bg-green-300 border-green-300">
                        Resolved
                    </Badge>
                );
            case "in_progress":
                return (
                    <Badge className="bg-blue-200 text-blue-800 hover:bg-blue-300 border-blue-300">
                        In Progress
                    </Badge>
                );
            case "failure":
                return (
                    <Badge className="bg-red-200 text-red-800 hover:bg-red-300 border-red-300">
                        Failure
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Helper function to truncate long text
    const truncateText = (text: string, maxLength = 50) => {
        if (!text) return "N/A";
        return text.length > maxLength
            ? `${text.substring(0, maxLength)}...`
            : text;
    };

    // Toggle sort direction or set new sort field
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    // Get current errors based on active category
    const getCurrentErrors = () => {
        switch (activeCategory) {
            case "user_errors":
                return userErrors;
            case "house_user_errors":
                return houseUserErrors;
            case "general_errors":
                return generalErrors;
            case "authentication_errors":
                return authErrors;
            default:
                return [];
        }
    };

    // Filter, sort, and search the errors
    const getFilteredErrors = () => {
        let filtered = [...getCurrentErrors()];

        // Filter by status
        if (statusFilter !== "all") {
            filtered = filtered.filter(
                (err) =>
                    err.status.toLowerCase() === statusFilter.toLowerCase(),
            );
        }

        // Filter by search term
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (err) =>
                    (err.errorType &&
                        err.errorType.toLowerCase().includes(searchLower)) ||
                    (err.errorMessage &&
                        err.errorMessage.toLowerCase().includes(searchLower)) ||
                    ((err as any).userName &&
                        (err as any).userName
                            .toLowerCase()
                            .includes(searchLower)) ||
                    ((err as any).userEmail &&
                        (err as any).userEmail
                            .toLowerCase()
                            .includes(searchLower)),
            );
        }

        // Sort the data
        filtered.sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case "errorType":
                    comparison = (a.errorType || "").localeCompare(
                        b.errorType || "",
                    );
                    break;
                case "errorMessage":
                    comparison = (a.errorMessage || "").localeCompare(
                        b.errorMessage || "",
                    );
                    break;
                case "status":
                    comparison = (a.status || "").localeCompare(b.status || "");
                    break;
                case "timestamp":
                default:
                    // For timestamp, we need to convert to Date objects
                    const dateA = a.timestamp?.toDate
                        ? a.timestamp.toDate()
                        : new Date();
                    const dateB = b.timestamp?.toDate
                        ? b.timestamp.toDate()
                        : new Date();
                    comparison = dateA.getTime() - dateB.getTime();
                    break;
            }

            return sortDirection === "asc" ? comparison : -comparison;
        });

        return filtered;
    };

    // Reset all filters
    const resetFilters = () => {
        setSearchTerm("");
        setSortField("timestamp");
        setSortDirection("desc");
        setStatusFilter("all");
    };

    const filteredErrors = getFilteredErrors();

    // Calculate statistics for the current category
    const getStatistics = (): ErrorStatistics => {
        const errors = getCurrentErrors();
        const today = new Date();

        // Count by status
        const byStatus = {
            pending: 0,
            in_progress: 0,
            resolved: 0,
            failure: 0,
            other: 0,
        };

        // Track error types for most common
        const typeCount = new Map<string, number>();

        // Track dates for trend
        const dateCount = new Map<string, number>();

        // Initialize last 7 days for trend
        for (let i = 6; i >= 0; i--) {
            const date = subDays(today, i);
            dateCount.set(format(date, "MM-dd"), 0);
        }

        // Resolution time tracking
        let totalResolutionTime = 0;
        let resolvedCount = 0;

        errors.forEach((err) => {
            // Count by status
            switch (err.status.toLowerCase()) {
                case "pending":
                    byStatus.pending++;
                    break;
                case "in_progress":
                    byStatus.in_progress++;
                    break;
                case "resolved":
                case "solved":
                    byStatus.resolved++;
                    break;
                case "failure":
                    byStatus.failure++;
                    break;
                default:
                    byStatus.other++;
            }

            // Count by type
            const errorType = err.errorType || "Unknown";
            typeCount.set(errorType, (typeCount.get(errorType) || 0) + 1);

            // Track for trend
            try {
                if (err.timestamp) {
                    // Ensure we handle timestamp properly
                    let errDate: Date;
                    if (err.timestamp.toDate) {
                        errDate = err.timestamp.toDate();
                    } else if (
                        typeof err.timestamp === "number" ||
                        typeof err.timestamp === "string"
                    ) {
                        errDate = new Date(err.timestamp);
                    } else {
                        console.error(
                            "Could not parse timestamp format:",
                            err.timestamp,
                        );
                        errDate = new Date();
                    }

                    // Only count errors from the last 7 days
                    if (errDate >= subDays(today, 7)) {
                        const dateStr = format(errDate, "MM-dd");
                        dateCount.set(
                            dateStr,
                            (dateCount.get(dateStr) || 0) + 1,
                        );
                    }

                    // Calculate resolution time for resolved errors
                    if (
                        (err.status.toLowerCase() === "resolved" ||
                            err.status.toLowerCase() === "solved") &&
                        err.timestamp &&
                        (err as any).resolvedAt
                    ) {
                        const createdAt = err.timestamp.toDate
                            ? err.timestamp.toDate()
                            : new Date();
                        const resolvedAt = (err as any).resolvedAt;

                        // Handle resolvedAt timestamp properly
                        let resolvedDate: Date;
                        if (resolvedAt.toDate) {
                            resolvedDate = resolvedAt.toDate();
                        } else if (
                            typeof resolvedAt === "number" ||
                            typeof resolvedAt === "string"
                        ) {
                            resolvedDate = new Date(resolvedAt);
                        } else {
                            console.error(
                                "Could not parse resolvedAt timestamp format:",
                                resolvedAt,
                            );
                            resolvedDate = new Date();
                        }

                        const diffInHours =
                            (resolvedDate.getTime() - createdAt.getTime()) /
                            (1000 * 60 * 60);
                        totalResolutionTime += diffInHours;
                        resolvedCount++;
                    }
                }
            } catch (e) {
                // Skip date processing if there's an error
                console.error("Error processing date:", e);
            }
        });

        // Convert type map to sorted array
        const mostCommonTypes = Array.from(typeCount.entries())
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Convert date map to sorted array
        const recentTrend = Array.from(dateCount.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return {
            totalCount: errors.length,
            byStatus,
            mostCommonTypes,
            recentTrend,
            avgResolutionTime:
                resolvedCount > 0
                    ? totalResolutionTime / resolvedCount
                    : undefined,
        };
    };

    // Calculate combined statistics across all categories
    const calculateAllTimeStatistics = (): AllTimeStatistics => {
        setLoadingAllTimeStats(true);

        // Combined data structure
        const allTimeStats: AllTimeStatistics = {
            totalErrors: 0,
            byCategoryCount: {
                user_errors: 0,
                house_user_errors: 0,
                general_errors: 0,
                authentication_errors: 0,
            },
            byCategoryAndStatus: {
                user_errors: {
                    pending: 0,
                    in_progress: 0,
                    resolved: 0,
                    failure: 0,
                    other: 0,
                },
                house_user_errors: {
                    pending: 0,
                    in_progress: 0,
                    resolved: 0,
                    failure: 0,
                    other: 0,
                },
                general_errors: {
                    pending: 0,
                    in_progress: 0,
                    resolved: 0,
                    failure: 0,
                    other: 0,
                },
                authentication_errors: {
                    pending: 0,
                    in_progress: 0,
                    resolved: 0,
                    failure: 0,
                    other: 0,
                },
            },
            mostCommonErrorTypes: [],
            monthlyTrend: [],
            avgResolutionTimeByCategory: {
                user_errors: null,
                house_user_errors: null,
                general_errors: null,
                authentication_errors: null,
            },
            errorDistributionByDay: [
                { dayOfWeek: "Sun", count: 0 },
                { dayOfWeek: "Mon", count: 0 },
                { dayOfWeek: "Tue", count: 0 },
                { dayOfWeek: "Wed", count: 0 },
                { dayOfWeek: "Thu", count: 0 },
                { dayOfWeek: "Fri", count: 0 },
                { dayOfWeek: "Sat", count: 0 },
            ],
            resolvedVsUnresolved: {
                resolved: 0,
                unresolved: 0,
            },
        };

        // Initialize monthly trend data for the last 6 months
        const today = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const month = subMonths(today, i);
            const monthKey = format(month, "MMM yyyy");
            months.push(monthKey);
            allTimeStats.monthlyTrend.push({
                month: monthKey,
                user_errors: 0,
                house_user_errors: 0,
                general_errors: 0,
                authentication_errors: 0,
            });
        }

        // Error type counter across all categories
        const allErrorTypes = new Map<
            string,
            { count: number; category: ErrorCategory }
        >();

        // Define all categories we want to process
        const categories: ErrorCategory[] = [
            "user_errors",
            "house_user_errors",
            "general_errors",
            "authentication_errors",
        ];

        // Helper function to fetch errors directly using Firestore
        const getErrorsForCategory = async (
            category: ErrorCategory,
        ): Promise<BaseErrorData[]> => {
            try {
                // Create a query against the errors collection, ordered by timestamp
                const errorsRef = collection(db, "logs", category, "errors");
                const q = query(errorsRef, orderBy("timestamp", "desc"));

                // Get all documents
                const querySnapshot = await getDocs(q);

                // Convert documents to BaseErrorData objects
                const errors = querySnapshot.docs.map((doc) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        additionalData: data.additionalData || {},
                        deviceInfo: data.deviceInfo || "N/A",
                        errorMessage: data.errorMessage || "",
                        errorType: data.errorType || "",
                        stackTrace: data.stackTrace || "",
                        status: data.status || "Unknown",
                        timestamp: data.timestamp || null,
                        ...data,
                    } as BaseErrorData;
                });

                return errors;
            } catch (error) {
                console.error(`Error fetching all ${category}:`, error);
                toast.error(`Failed to load ${category.replace("_", " ")}`);
                return [];
            }
        };

        // Use Promise.all to fetch all data from all categories
        const fetchAllData = async () => {
            try {
                const categoryResults = await Promise.all(
                    categories.map((category) =>
                        getErrorsForCategory(category),
                    ),
                );

                // Process each category's data
                categoryResults.forEach(
                    (data: BaseErrorData[], index: number) => {
                        const category = categories[index];

                        // Count total errors per category
                        allTimeStats.byCategoryCount[category] = data.length;
                        allTimeStats.totalErrors += data.length;

                        // Resolution time tracking per category
                        let totalResolutionTime = 0;
                        let resolvedCount = 0;

                        // Process each error
                        data.forEach((err: BaseErrorData) => {
                            // Count by status
                            const status = err.status.toLowerCase();
                            if (status === "pending") {
                                allTimeStats.byCategoryAndStatus[category]
                                    .pending++;
                                allTimeStats.resolvedVsUnresolved.unresolved++;
                            } else if (status === "in_progress") {
                                allTimeStats.byCategoryAndStatus[category]
                                    .in_progress++;
                                allTimeStats.resolvedVsUnresolved.unresolved++;
                            } else if (
                                status === "resolved" ||
                                status === "solved"
                            ) {
                                allTimeStats.byCategoryAndStatus[category]
                                    .resolved++;
                                allTimeStats.resolvedVsUnresolved.resolved++;
                            } else if (status === "failure") {
                                allTimeStats.byCategoryAndStatus[category]
                                    .failure++;
                                allTimeStats.resolvedVsUnresolved.unresolved++;
                            } else {
                                allTimeStats.byCategoryAndStatus[category]
                                    .other++;
                                allTimeStats.resolvedVsUnresolved.unresolved++;
                            }

                            // Collect error types
                            const errorType = err.errorType || "Unknown";
                            const current = allErrorTypes.get(errorType) || {
                                count: 0,
                                category,
                            };
                            allErrorTypes.set(errorType, {
                                count: current.count + 1,
                                category,
                            });

                            // Process timestamps for trends and day distribution
                            try {
                                if (err.timestamp) {
                                    // Ensure we handle timestamp properly
                                    let date: Date;
                                    if (err.timestamp.toDate) {
                                        date = err.timestamp.toDate();
                                    } else if (
                                        typeof err.timestamp === "number" ||
                                        typeof err.timestamp === "string"
                                    ) {
                                        date = new Date(err.timestamp);
                                    } else {
                                        // If we can't determine the date format, use current date as fallback
                                        console.error(
                                            "Could not parse timestamp format:",
                                            err.timestamp,
                                        );
                                        date = new Date();
                                    }

                                    // Monthly trend
                                    const monthKey = format(date, "MMM yyyy");
                                    const monthIndex =
                                        allTimeStats.monthlyTrend.findIndex(
                                            (m) => m.month === monthKey,
                                        );
                                    if (monthIndex >= 0) {
                                        allTimeStats.monthlyTrend[monthIndex][
                                            category
                                        ]++;
                                    }

                                    // Day of week distribution
                                    const dayOfWeek = date.getDay(); // 0 for Sunday, 6 for Saturday
                                    allTimeStats.errorDistributionByDay[
                                        dayOfWeek
                                    ].count++;

                                    // Resolution time calculation
                                    if (
                                        (status === "resolved" ||
                                            status === "solved") &&
                                        (err as any).resolvedAt
                                    ) {
                                        const resolvedAt = (err as any)
                                            .resolvedAt;
                                        // Handle resolvedAt timestamp similarly
                                        let resolvedDate: Date;
                                        if (resolvedAt.toDate) {
                                            resolvedDate = resolvedAt.toDate();
                                        } else if (
                                            typeof resolvedAt === "number" ||
                                            typeof resolvedAt === "string"
                                        ) {
                                            resolvedDate = new Date(resolvedAt);
                                        } else {
                                            // Use current date as fallback if format unknown
                                            console.error(
                                                "Could not parse resolvedAt timestamp format:",
                                                resolvedAt,
                                            );
                                            resolvedDate = new Date();
                                        }

                                        const diffInHours =
                                            (resolvedDate.getTime() -
                                                date.getTime()) /
                                            (1000 * 60 * 60);
                                        totalResolutionTime += diffInHours;
                                        resolvedCount++;
                                    }
                                }
                            } catch (e) {
                                console.error(
                                    `Error processing date for ${category}:`,
                                    e,
                                );
                            }
                        });

                        // Calculate average resolution time for this category
                        if (resolvedCount > 0) {
                            allTimeStats.avgResolutionTimeByCategory[category] =
                                totalResolutionTime / resolvedCount;
                        }
                    },
                );

                // Convert error types to sorted array
                allTimeStats.mostCommonErrorTypes = Array.from(
                    allErrorTypes.entries(),
                )
                    .map(([type, { count, category }]) => ({
                        type,
                        count,
                        category,
                    }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10);

                // Set the state with processed data
                setAllTimeStats(allTimeStats);
                setLoadingAllTimeStats(false);
            } catch (error) {
                console.error("Error fetching all-time statistics:", error);
                toast.error("Failed to load all-time statistics");
                setLoadingAllTimeStats(false);
            }
        };

        // Start the data fetching process
        fetchAllData();

        // Return empty stats initially, will be updated by Promise
        return allTimeStats;
    };

    // Handle opening all time statistics dialog
    const handleOpenAllTimeStats = () => {
        setAllTimeStatsDialogOpen(true);
        setAllTimeStats(null); // Clear any previous data
        calculateAllTimeStatistics();
    };

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Error Logs</h1>
                <div className="flex gap-2">
                    <Button
                        variant="default"
                        onClick={handleOpenAllTimeStats}
                        className="flex items-center gap-2 bg-[#0091D5] hover:bg-[#007bb8]"
                    >
                        <Activity className="h-4 w-4" />
                        All Time Statistics
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                        />
                        {refreshing ? "Refreshing..." : "Refresh Data"}
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card className="mb-8">
                <CardHeader className="pb-3">
                    <CardTitle>Error Categories</CardTitle>
                    <CardDescription>
                        View all logged errors by category
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs
                        defaultValue="user_errors"
                        value={activeCategory}
                        onValueChange={(value) => {
                            setActiveCategory(value as ErrorCategory);
                            // Reset view to list when changing categories
                            setActiveView("list");
                        }}
                    >
                        <TabsList className="mb-4">
                            <TabsTrigger
                                value="user_errors"
                                className={`${activeCategory === "user_errors" ? "bg-[#0091D5] text-white font-bold shadow-md" : ""} transition-all duration-200`}
                            >
                                User Errors
                            </TabsTrigger>
                            <TabsTrigger
                                value="house_user_errors"
                                className={`${activeCategory === "house_user_errors" ? "bg-[#0091D5] text-white font-bold shadow-md" : ""} transition-all duration-200`}
                            >
                                House User Errors
                            </TabsTrigger>
                            <TabsTrigger
                                value="general_errors"
                                className={`${activeCategory === "general_errors" ? "bg-[#0091D5] text-white font-bold shadow-md" : ""} transition-all duration-200`}
                            >
                                General Errors
                            </TabsTrigger>
                            <TabsTrigger
                                value="authentication_errors"
                                className={`${activeCategory === "authentication_errors" ? "bg-[#0091D5] text-white font-bold shadow-md" : ""} transition-all duration-200`}
                            >
                                Auth Errors
                            </TabsTrigger>
                        </TabsList>

                        {/* View toggle: List or Statistics */}
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex gap-2">
                                <Button
                                    variant={
                                        activeView === "list"
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                    onClick={() => setActiveView("list")}
                                    className="flex items-center gap-2"
                                >
                                    <ListFilter className="h-4 w-4" />
                                    List View
                                </Button>
                                <Button
                                    variant={
                                        activeView === "statistics"
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                    onClick={() => setActiveView("statistics")}
                                    className="flex items-center gap-2"
                                >
                                    <BarChart2 className="h-4 w-4" />
                                    Statistics
                                </Button>
                            </div>

                            {activeView === "list" && (
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search errors..."
                                            className="pl-8"
                                            value={searchTerm}
                                            onChange={(e) =>
                                                setSearchTerm(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Select
                                            value={statusFilter}
                                            onValueChange={setStatusFilter}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <Filter className="mr-2 h-4 w-4" />
                                                <SelectValue placeholder="Filter by status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    All Statuses
                                                </SelectItem>
                                                <SelectItem value="pending">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                                                        <span>Pending</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="in_progress">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-3 w-3 rounded-full bg-blue-400"></div>
                                                        <span>In Progress</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="resolved">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-3 w-3 rounded-full bg-green-400"></div>
                                                        <span>Resolved</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="failure">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-3 w-3 rounded-full bg-red-400"></div>
                                                        <span>Failure</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={resetFilters}
                                            title="Reset filters"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <TabsContent value="user_errors">
                            {activeView === "list" ? (
                                <ErrorTable
                                    errors={filteredErrors}
                                    loading={loading}
                                    formatTimestamp={formatTimestamp}
                                    getStatusBadge={getStatusBadge}
                                    truncateText={truncateText}
                                    onRowClick={handleRowClick}
                                    sortField={sortField}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                />
                            ) : (
                                <ErrorStatisticsView
                                    statistics={getStatistics()}
                                    loading={loading}
                                    category="user_errors"
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="house_user_errors">
                            {activeView === "list" ? (
                                <ErrorTable
                                    errors={filteredErrors}
                                    loading={loading}
                                    formatTimestamp={formatTimestamp}
                                    getStatusBadge={getStatusBadge}
                                    truncateText={truncateText}
                                    onRowClick={handleRowClick}
                                    sortField={sortField}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                />
                            ) : (
                                <ErrorStatisticsView
                                    statistics={getStatistics()}
                                    loading={loading}
                                    category="house_user_errors"
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="general_errors">
                            {activeView === "list" ? (
                                <ErrorTable
                                    errors={filteredErrors}
                                    loading={loading}
                                    formatTimestamp={formatTimestamp}
                                    getStatusBadge={getStatusBadge}
                                    truncateText={truncateText}
                                    onRowClick={handleRowClick}
                                    sortField={sortField}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                />
                            ) : (
                                <ErrorStatisticsView
                                    statistics={getStatistics()}
                                    loading={loading}
                                    category="general_errors"
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="authentication_errors">
                            {activeView === "list" ? (
                                <ErrorTable
                                    errors={filteredErrors}
                                    loading={loading}
                                    formatTimestamp={formatTimestamp}
                                    getStatusBadge={getStatusBadge}
                                    truncateText={truncateText}
                                    onRowClick={handleRowClick}
                                    sortField={sortField}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                />
                            ) : (
                                <ErrorStatisticsView
                                    statistics={getStatistics()}
                                    loading={loading}
                                    category="authentication_errors"
                                />
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
                <CardFooter className="border-t py-3">
                    <div className="text-sm text-muted-foreground">
                        {activeView === "list"
                            ? `Showing ${filteredErrors.length} of ${getCurrentErrors().length} errors`
                            : `Analyzing ${getCurrentErrors().length} errors in this category`}
                    </div>
                </CardFooter>
            </Card>

            {/* Only show stack trace section in list view */}
            {activeView === "list" && getCurrentErrors().length > 0 && (
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">Error Details</h2>
                    <p className="text-muted-foreground mb-4">
                        Displaying the latest error for the selected category.
                        Click on any error row for more details.
                    </p>

                    <Card>
                        <CardHeader>
                            <CardTitle>Error Stack Trace</CardTitle>
                            <CardDescription>
                                Most recent error stack trace
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="whitespace-pre-wrap font-mono text-xs bg-muted p-4 rounded-md max-h-96 overflow-y-auto">
                                {getCurrentErrors()[0]?.stackTrace ||
                                    "No stack trace available"}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Detail Dialog */}
            <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Error Details</DialogTitle>
                        <DialogDescription>
                            Full details and management options for the selected
                            error
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        {/* Error details column */}
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">
                                    Error Information
                                </h3>
                                <div className="grid grid-cols-1 gap-2">
                                    <div className="bg-muted p-3 rounded">
                                        <div className="text-xs text-muted-foreground mb-1">
                                            Type
                                        </div>
                                        <div className="font-medium">
                                            {selectedError?.errorType ||
                                                "Unknown"}
                                        </div>
                                    </div>

                                    <div className="bg-muted p-3 rounded">
                                        <div className="text-xs text-muted-foreground mb-1">
                                            Message
                                        </div>
                                        <div className="font-medium break-words">
                                            {selectedError?.errorMessage ||
                                                "N/A"}
                                        </div>
                                    </div>

                                    <div className="bg-muted p-3 rounded">
                                        <div className="text-xs text-muted-foreground mb-1">
                                            Status
                                        </div>
                                        <div>
                                            {selectedError &&
                                                getStatusBadge(
                                                    selectedError.status,
                                                )}
                                        </div>
                                    </div>

                                    <div className="bg-muted p-3 rounded">
                                        <div className="text-xs text-muted-foreground mb-1">
                                            Time
                                        </div>
                                        <div className="font-medium">
                                            {selectedError &&
                                                formatTimestamp(
                                                    selectedError.timestamp,
                                                )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* User information if available */}
                            {((selectedError as any)?.userName ||
                                (selectedError as any)?.userEmail) && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">
                                        User Information
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(selectedError as any)?.userName && (
                                            <div className="bg-muted p-3 rounded">
                                                <div className="text-xs text-muted-foreground mb-1">
                                                    Name
                                                </div>
                                                <div className="font-medium">
                                                    {
                                                        (selectedError as any)
                                                            .userName
                                                    }
                                                </div>
                                            </div>
                                        )}

                                        {(selectedError as any)?.userEmail && (
                                            <div className="bg-muted p-3 rounded">
                                                <div className="text-xs text-muted-foreground mb-1">
                                                    Email
                                                </div>
                                                <div className="font-medium">
                                                    {
                                                        (selectedError as any)
                                                            .userEmail
                                                    }
                                                </div>
                                            </div>
                                        )}

                                        {(selectedError as any)?.userPhone && (
                                            <div className="bg-muted p-3 rounded">
                                                <div className="text-xs text-muted-foreground mb-1">
                                                    Phone
                                                </div>
                                                <div className="font-medium">
                                                    {
                                                        (selectedError as any)
                                                            .userPhone
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* House information if available */}
                            {((selectedError as any)?.houseId ||
                                (selectedError as any)?.houseName) && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">
                                        House Information
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(selectedError as any)?.houseName && (
                                            <div className="bg-muted p-3 rounded">
                                                <div className="text-xs text-muted-foreground mb-1">
                                                    Name
                                                </div>
                                                <div className="font-medium">
                                                    {
                                                        (selectedError as any)
                                                            .houseName
                                                    }
                                                </div>
                                            </div>
                                        )}

                                        {(selectedError as any)?.houseId && (
                                            <div className="bg-muted p-3 rounded">
                                                <div className="text-xs text-muted-foreground mb-1">
                                                    ID
                                                </div>
                                                <div className="font-medium break-all">
                                                    {
                                                        (selectedError as any)
                                                            .houseId
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Stack trace */}
                            <div>
                                <h3 className="text-lg font-semibold mb-2">
                                    Stack Trace
                                </h3>
                                <div className="whitespace-pre-wrap font-mono text-xs bg-muted p-4 rounded-md max-h-64 overflow-y-auto">
                                    {selectedError?.stackTrace ||
                                        "No stack trace available"}
                                </div>
                            </div>
                        </div>

                        {/* Operations panel column */}
                        <div className="border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
                            <h3 className="text-lg font-semibold mb-4">
                                Operations
                            </h3>

                            <div className="space-y-6">
                                {/* Status update section */}
                                <div className="space-y-4">
                                    <Label htmlFor="error-status">
                                        Error Status
                                    </Label>
                                    <Select
                                        value={
                                            selectedError?.status || "pending"
                                        }
                                        onValueChange={(value) =>
                                            updateErrorStatus(value)
                                        }
                                        disabled={updatingStatus}
                                    >
                                        <SelectTrigger id="error-status">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-yellow-500" />
                                                    <span>Pending</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="in_progress">
                                                <div className="flex items-center gap-2">
                                                    <RefreshCw className="h-4 w-4 text-blue-500" />
                                                    <span>In Progress</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="resolved">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    <span>Resolved</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="failure">
                                                <div className="flex items-center gap-2">
                                                    <XCircle className="h-4 w-4 text-red-500" />
                                                    <span>Failure</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <div className="text-sm text-muted-foreground">
                                        {updatingStatus
                                            ? "Updating status..."
                                            : "Change the status to update progress on this error"}
                                    </div>
                                </div>

                                <Separator />

                                {/* Other operations - placeholders for future functionality */}
                                <div className="space-y-4">
                                    <h4 className="font-medium">
                                        Additional Operations
                                    </h4>

                                    <div className="grid gap-2">
                                        <Button
                                            variant="outline"
                                            className="justify-start"
                                            disabled
                                        >
                                            <span>Assign to Team Member</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            className="justify-start"
                                            disabled
                                        >
                                            <span>Add Note</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            className="justify-start"
                                            disabled
                                        >
                                            <span>View Related Errors</span>
                                        </Button>
                                    </div>

                                    <div className="text-sm text-muted-foreground italic">
                                        Additional operations will be available
                                        in future updates
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDetailDialogOpen(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* All Time Statistics Dialog */}
            <Dialog
                open={allTimeStatsDialogOpen}
                onOpenChange={(open) => {
                    setAllTimeStatsDialogOpen(open);
                    // Recalculate stats when reopening
                    if (open && !loadingAllTimeStats) {
                        calculateAllTimeStatistics();
                    }
                }}
            >
                <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl flex items-center gap-2">
                            <Activity className="h-6 w-6 text-[#0091D5]" />
                            All Time Error Statistics
                        </DialogTitle>
                        <DialogDescription>
                            Comprehensive analysis of all error data across
                            categories
                        </DialogDescription>
                    </DialogHeader>

                    {loadingAllTimeStats ? (
                        <div className="py-12 text-center">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-[#0091D5]" />
                            <p className="mt-4 text-muted-foreground">
                                Loading comprehensive statistics...
                            </p>
                        </div>
                    ) : allTimeStats ? (
                        <AllTimeStatisticsView statistics={allTimeStats} />
                    ) : (
                        <div className="py-12 text-center text-muted-foreground">
                            No statistics available
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setAllTimeStatsDialogOpen(false)}
                        >
                            Close
                        </Button>
                        <Button
                            variant="default"
                            className="bg-[#0091D5] hover:bg-[#007bb8]"
                            onClick={() => {
                                calculateAllTimeStatistics();
                            }}
                        >
                            <RefreshCw
                                className={`h-4 w-4 mr-2 ${loadingAllTimeStats ? "animate-spin" : ""}`}
                            />
                            Refresh Statistics
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

interface ErrorTableProps {
    errors: BaseErrorData[];
    loading: boolean;
    formatTimestamp: (timestamp: any) => string;
    getStatusBadge: (status: string) => React.ReactElement;
    truncateText: (text: string, maxLength?: number) => string;
    onRowClick: (error: BaseErrorData) => void;
    sortField: SortField;
    sortDirection: SortDirection;
    onSort: (field: SortField) => void;
}

function ErrorTable({
    errors,
    loading,
    formatTimestamp,
    getStatusBadge,
    truncateText,
    onRowClick,
    sortField,
    sortDirection,
    onSort,
}: ErrorTableProps) {
    if (loading) {
        return <div className="py-8 text-center">Loading error data...</div>;
    }

    if (errors.length === 0) {
        return (
            <div className="py-8 text-center">
                No errors found in this category.
            </div>
        );
    }

    const getSortIcon = (field: SortField) => {
        if (sortField !== field)
            return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
        return sortDirection === "asc" ? (
            <ArrowUpDown className="h-4 w-4 ml-1 text-primary" />
        ) : (
            <ArrowUpDown className="h-4 w-4 ml-1 text-primary rotate-180" />
        );
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead
                            className="cursor-pointer"
                            onClick={() => onSort("errorType")}
                        >
                            <div className="flex items-center">
                                Error Type
                                {getSortIcon("errorType")}
                            </div>
                        </TableHead>
                        <TableHead
                            className="cursor-pointer"
                            onClick={() => onSort("errorMessage")}
                        >
                            <div className="flex items-center">
                                Message
                                {getSortIcon("errorMessage")}
                            </div>
                        </TableHead>
                        <TableHead
                            className="cursor-pointer"
                            onClick={() => onSort("status")}
                        >
                            <div className="flex items-center">
                                Status
                                {getSortIcon("status")}
                            </div>
                        </TableHead>
                        <TableHead>User</TableHead>
                        <TableHead
                            className="cursor-pointer"
                            onClick={() => onSort("timestamp")}
                        >
                            <div className="flex items-center">
                                Time
                                {getSortIcon("timestamp")}
                            </div>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {errors.map((error) => (
                        <TableRow
                            key={error.id}
                            className="cursor-pointer hover:bg-muted"
                            onClick={() => onRowClick(error)}
                        >
                            <TableCell>
                                {error.errorType || "Unknown"}
                            </TableCell>
                            <TableCell className="max-w-xs">
                                {truncateText(error.errorMessage, 70)}
                            </TableCell>
                            <TableCell>
                                {getStatusBadge(error.status)}
                            </TableCell>
                            <TableCell>
                                {(error as any).userName ||
                                    (error as any).userEmail ||
                                    "N/A"}
                            </TableCell>
                            <TableCell>
                                {formatTimestamp(error.timestamp)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// Statistics view component
interface ErrorStatisticsViewProps {
    statistics: ErrorStatistics;
    loading: boolean;
    category: ErrorCategory;
}

function ErrorStatisticsView({
    statistics,
    loading,
    category,
}: ErrorStatisticsViewProps) {
    const categoryTitle = {
        user_errors: "User Errors",
        house_user_errors: "House User Errors",
        general_errors: "General Errors",
        authentication_errors: "Authentication Errors",
    }[category];

    if (loading) {
        return (
            <div className="py-8 text-center">Loading error statistics...</div>
        );
    }

    // Create percentage for status distribution
    const totalErrors = statistics.totalCount;
    const getPercentage = (count: number) =>
        totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total errors card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Total Errors</CardTitle>
                        <CardDescription>
                            All {categoryTitle.toLowerCase()}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-[#1C4E80]">
                            {statistics.totalCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {totalErrors === 0
                                ? "No errors recorded"
                                : `${statistics.byStatus.resolved} resolved (${getPercentage(statistics.byStatus.resolved)}%)`}
                        </p>
                    </CardContent>
                </Card>

                {/* Status distribution card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">
                            Status Distribution
                        </CardTitle>
                        <CardDescription>
                            Error resolution status
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                            <span className="text-sm">
                                Pending: {statistics.byStatus.pending}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-3 w-3 rounded-full bg-blue-400"></div>
                            <span className="text-sm">
                                In Progress: {statistics.byStatus.in_progress}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-3 w-3 rounded-full bg-green-400"></div>
                            <span className="text-sm">
                                Resolved: {statistics.byStatus.resolved}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-red-400"></div>
                            <span className="text-sm">
                                Failure: {statistics.byStatus.failure}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Resolution time card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">
                            Avg. Resolution Time
                        </CardTitle>
                        <CardDescription>For resolved errors</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-[#1C4E80]">
                            {statistics.avgResolutionTime
                                ? `${statistics.avgResolutionTime.toFixed(1)}h`
                                : "N/A"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {statistics.avgResolutionTime
                                ? `Based on ${statistics.byStatus.resolved} resolved errors`
                                : "No resolved errors with timestamps"}
                        </p>
                    </CardContent>
                </Card>

                {/* Trend card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">7-Day Trend</CardTitle>
                        <CardDescription>
                            Recent error frequency
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end h-12 gap-1">
                            {statistics.recentTrend.map((day, i) => {
                                const maxCount = Math.max(
                                    ...statistics.recentTrend.map(
                                        (d) => d.count,
                                    ),
                                );
                                const height =
                                    maxCount > 0
                                        ? (day.count / maxCount) * 100
                                        : 0;

                                return (
                                    <div
                                        key={i}
                                        className="flex flex-col items-center flex-1"
                                    >
                                        <div
                                            className="w-full bg-[#0091D5]/60 rounded-sm"
                                            style={{ height: `${height}%` }}
                                        ></div>
                                        <div className="text-[10px] text-muted-foreground mt-1">
                                            {day.date.split("-")[1]}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Most common error types */}
            <Card>
                <CardHeader>
                    <CardTitle>Most Common Error Types</CardTitle>
                    <CardDescription>
                        Top {statistics.mostCommonTypes.length} error types by
                        frequency
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {statistics.mostCommonTypes.length > 0 ? (
                        <div className="space-y-6">
                            {/* Pie Chart */}
                            <div className="flex justify-center">
                                <div className="relative h-48 w-48">
                                    <svg
                                        viewBox="0 0 100 100"
                                        className="h-full w-full -rotate-90"
                                    >
                                        {(() => {
                                            // Generate pie chart segments
                                            const segments: React.ReactElement[] =
                                                [];
                                            let cumulativePercentage = 0;

                                            // Define colors for pie segments
                                            const colors = [
                                                "#0091D5", // Primary blue
                                                "#FF6B6B", // Coral red
                                                "#4ADE80", // Green
                                                "#FFAB4C", // Amber/orange
                                                "#9F7AEA", // Purple
                                            ];

                                            statistics.mostCommonTypes.forEach(
                                                (item, index) => {
                                                    const percentage =
                                                        getPercentage(
                                                            item.count,
                                                        );

                                                    if (percentage > 0) {
                                                        // Calculate start and end points
                                                        const startX =
                                                            50 +
                                                            40 *
                                                                Math.cos(
                                                                    (2 *
                                                                        Math.PI *
                                                                        cumulativePercentage) /
                                                                        100,
                                                                );
                                                        const startY =
                                                            50 +
                                                            40 *
                                                                Math.sin(
                                                                    (2 *
                                                                        Math.PI *
                                                                        cumulativePercentage) /
                                                                        100,
                                                                );

                                                        cumulativePercentage +=
                                                            percentage;

                                                        const endX =
                                                            50 +
                                                            40 *
                                                                Math.cos(
                                                                    (2 *
                                                                        Math.PI *
                                                                        cumulativePercentage) /
                                                                        100,
                                                                );
                                                        const endY =
                                                            50 +
                                                            40 *
                                                                Math.sin(
                                                                    (2 *
                                                                        Math.PI *
                                                                        cumulativePercentage) /
                                                                        100,
                                                                );

                                                        // For segments less than 50%, use regular arcs
                                                        const largeArcFlag =
                                                            percentage > 50
                                                                ? 1
                                                                : 0;

                                                        segments.push(
                                                            <path
                                                                key={index}
                                                                d={`M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                                                                fill={
                                                                    colors[
                                                                        index %
                                                                            colors.length
                                                                    ]
                                                                }
                                                                stroke="#fff"
                                                                strokeWidth="0.5"
                                                            />,
                                                        );
                                                    }
                                                },
                                            );

                                            // If all errors are the same type, create a full circle
                                            if (
                                                segments.length === 1 &&
                                                getPercentage(
                                                    statistics
                                                        .mostCommonTypes[0]
                                                        .count,
                                                ) === 100
                                            ) {
                                                return (
                                                    <circle
                                                        cx="50"
                                                        cy="50"
                                                        r="40"
                                                        fill={colors[0]}
                                                        stroke="#fff"
                                                        strokeWidth="0.5"
                                                    />
                                                );
                                            }

                                            return segments;
                                        })()}

                                        {/* Donut hole */}
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="20"
                                            fill="white"
                                        />
                                    </svg>

                                    {/* Center text - total count */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold text-[#1C4E80]">
                                            {statistics.totalCount}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            total
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="grid grid-cols-1 gap-2">
                                {statistics.mostCommonTypes.map((item, i) => {
                                    const percentage = getPercentage(
                                        item.count,
                                    );
                                    const colors = [
                                        "#0091D5",
                                        "#FF6B6B",
                                        "#4ADE80",
                                        "#FFAB4C",
                                        "#9F7AEA",
                                    ];

                                    return (
                                        <div
                                            key={i}
                                            className="flex items-center gap-2"
                                        >
                                            <div
                                                className="h-3 w-3 rounded-sm flex-shrink-0"
                                                style={{
                                                    backgroundColor:
                                                        colors[
                                                            i % colors.length
                                                        ],
                                                }}
                                            ></div>
                                            <div className="flex justify-between items-center w-full text-sm">
                                                <span
                                                    className="font-medium truncate max-w-[60%]"
                                                    title={item.type}
                                                >
                                                    {item.type}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {item.count} ({percentage}%)
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="py-8 text-center text-muted-foreground">
                            No error type data available
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Insights card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-[#0091D5]" />
                        Insights & Recommendations
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {statistics.totalCount === 0 ? (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
                                No errors found in this category. Great work!
                            </div>
                        ) : (
                            <>
                                {statistics.byStatus.pending > 0 && (
                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">
                                        <p className="font-medium">
                                            Attention Required
                                        </p>
                                        <p className="text-sm mt-1">
                                            {statistics.byStatus.pending}{" "}
                                            pending errors need attention.
                                            {statistics.byStatus.pending > 5 &&
                                                " Consider prioritizing resolution."}
                                        </p>
                                    </div>
                                )}

                                {statistics.mostCommonTypes.length > 0 && (
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700">
                                        <p className="font-medium">
                                            Most Frequent Issues
                                        </p>
                                        <p className="text-sm mt-1">
                                            "
                                            {statistics.mostCommonTypes[0].type}
                                            " is the most common error (
                                            {
                                                statistics.mostCommonTypes[0]
                                                    .count
                                            }{" "}
                                            occurrences). Consider investigating
                                            root causes.
                                        </p>
                                    </div>
                                )}

                                {statistics.avgResolutionTime &&
                                    statistics.avgResolutionTime > 24 && (
                                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-md text-orange-700">
                                            <p className="font-medium">
                                                Resolution Time
                                            </p>
                                            <p className="text-sm mt-1">
                                                Average resolution time is{" "}
                                                {statistics.avgResolutionTime.toFixed(
                                                    1,
                                                )}{" "}
                                                hours, which exceeds 24 hours.
                                                Consider improving response
                                                times.
                                            </p>
                                        </div>
                                    )}

                                {statistics.recentTrend
                                    .slice(-3)
                                    .every((day) => day.count === 0) &&
                                    statistics.totalCount > 0 && (
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
                                            <p className="font-medium">
                                                Recent Improvement
                                            </p>
                                            <p className="text-sm mt-1">
                                                No new errors in the last 3
                                                days. Nice trend!
                                            </p>
                                        </div>
                                    )}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// All Time Statistics View Component
interface AllTimeStatisticsViewProps {
    statistics: AllTimeStatistics;
}

function AllTimeStatisticsView({ statistics }: AllTimeStatisticsViewProps) {
    // Helper to get percentage
    const getPercentage = (count: number, total: number) =>
        total > 0 ? Math.round((count / total) * 100) : 0;

    // Colors for consistent visualization
    const categoryColors = {
        user_errors: "#0091D5", // Primary blue
        house_user_errors: "#FF6B6B", // Coral red
        general_errors: "#4ADE80", // Green
        authentication_errors: "#FFAB4C", // Amber/orange
    };

    return (
        <div className="space-y-8 py-4">
            {/* Top summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Total Errors</CardTitle>
                        <CardDescription>Across all categories</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-[#0091D5]">
                            {statistics.totalErrors}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {statistics.resolvedVsUnresolved.resolved} resolved
                            (
                            {getPercentage(
                                statistics.resolvedVsUnresolved.resolved,
                                statistics.totalErrors,
                            )}
                            %)
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">By Category</CardTitle>
                        <CardDescription>Error distribution</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-3 w-3 rounded-full"
                                    style={{
                                        backgroundColor:
                                            categoryColors.user_errors,
                                    }}
                                ></div>
                                <span className="text-sm">User</span>
                            </div>
                            <span className="text-sm font-medium">
                                {statistics.byCategoryCount.user_errors}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-3 w-3 rounded-full"
                                    style={{
                                        backgroundColor:
                                            categoryColors.house_user_errors,
                                    }}
                                ></div>
                                <span className="text-sm">House User</span>
                            </div>
                            <span className="text-sm font-medium">
                                {statistics.byCategoryCount.house_user_errors}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-3 w-3 rounded-full"
                                    style={{
                                        backgroundColor:
                                            categoryColors.general_errors,
                                    }}
                                ></div>
                                <span className="text-sm">General</span>
                            </div>
                            <span className="text-sm font-medium">
                                {statistics.byCategoryCount.general_errors}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-3 w-3 rounded-full"
                                    style={{
                                        backgroundColor:
                                            categoryColors.authentication_errors,
                                    }}
                                ></div>
                                <span className="text-sm">Auth</span>
                            </div>
                            <span className="text-sm font-medium">
                                {
                                    statistics.byCategoryCount
                                        .authentication_errors
                                }
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">
                            Resolution Status
                        </CardTitle>
                        <CardDescription>
                            Resolved vs Unresolved
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative pt-1">
                            <div className="flex mb-2 items-center justify-between">
                                <div>
                                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                                        Resolved
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-semibold inline-block text-green-600">
                                        {getPercentage(
                                            statistics.resolvedVsUnresolved
                                                .resolved,
                                            statistics.totalErrors,
                                        )}
                                        %
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                                <div
                                    style={{
                                        width: `${getPercentage(statistics.resolvedVsUnresolved.resolved, statistics.totalErrors)}%`,
                                    }}
                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
                                ></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">
                            Avg. Resolution Time
                        </CardTitle>
                        <CardDescription>By category (hours)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        {Object.entries(
                            statistics.avgResolutionTimeByCategory,
                        ).map(([category, time]) => (
                            <div
                                key={category}
                                className="flex items-center justify-between"
                            >
                                <span className="text-sm">
                                    {category
                                        .split("_")
                                        .map(
                                            (word) =>
                                                word.charAt(0).toUpperCase() +
                                                word.slice(1),
                                        )
                                        .join(" ")}
                                    :
                                </span>
                                <span className="text-sm font-medium">
                                    {time !== null
                                        ? `${time.toFixed(1)}h`
                                        : "N/A"}
                                </span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Error trends over time */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LineChart className="h-5 w-5 text-[#0091D5]" />
                        Error Trends (6 Months)
                    </CardTitle>
                    <CardDescription>
                        Monthly distribution by category
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-64 relative">
                        {/* Chart container */}
                        <div className="absolute inset-0">
                            <svg
                                viewBox="0 0 800 240"
                                className="w-full h-full"
                            >
                                {/* X and Y axes */}
                                <line
                                    x1="50"
                                    y1="200"
                                    x2="750"
                                    y2="200"
                                    stroke="#e2e8f0"
                                    strokeWidth="1"
                                />
                                <line
                                    x1="50"
                                    y1="40"
                                    x2="50"
                                    y2="200"
                                    stroke="#e2e8f0"
                                    strokeWidth="1"
                                />

                                {/* Y-axis labels */}
                                <text
                                    x="30"
                                    y="200"
                                    fontSize="10"
                                    textAnchor="end"
                                    fill="#64748b"
                                >
                                    0
                                </text>
                                <text
                                    x="30"
                                    y="160"
                                    fontSize="10"
                                    textAnchor="end"
                                    fill="#64748b"
                                >
                                    25%
                                </text>
                                <text
                                    x="30"
                                    y="120"
                                    fontSize="10"
                                    textAnchor="end"
                                    fill="#64748b"
                                >
                                    50%
                                </text>
                                <text
                                    x="30"
                                    y="80"
                                    fontSize="10"
                                    textAnchor="end"
                                    fill="#64748b"
                                >
                                    75%
                                </text>
                                <text
                                    x="30"
                                    y="40"
                                    fontSize="10"
                                    textAnchor="end"
                                    fill="#64748b"
                                >
                                    100%
                                </text>

                                {(() => {
                                    // Calculate the max total for any month for scaling
                                    const maxMonthlyTotal = Math.max(
                                        ...statistics.monthlyTrend.map(
                                            (month) =>
                                                month.user_errors +
                                                month.house_user_errors +
                                                month.general_errors +
                                                month.authentication_errors,
                                        ),
                                    );

                                    // If no data, show empty chart
                                    if (maxMonthlyTotal === 0) {
                                        return (
                                            <text
                                                x="400"
                                                y="120"
                                                fontSize="14"
                                                textAnchor="middle"
                                                fill="#64748b"
                                            >
                                                No trend data available
                                            </text>
                                        );
                                    }

                                    const barWidth = 60;
                                    const barSpacing = 100; // Total width allocated per month
                                    const chartStart = 100; // Start X position for first bar

                                    return (
                                        <>
                                            {/* X-axis labels (months) */}
                                            {statistics.monthlyTrend.map(
                                                (month, i) => (
                                                    <text
                                                        key={`month-${i}`}
                                                        x={
                                                            chartStart +
                                                            i * barSpacing +
                                                            barWidth / 2
                                                        }
                                                        y="220"
                                                        fontSize="10"
                                                        textAnchor="middle"
                                                        fill="#64748b"
                                                    >
                                                        {month.month}
                                                    </text>
                                                ),
                                            )}

                                            {/* Stacked bars for each month */}
                                            {statistics.monthlyTrend.map(
                                                (month, i) => {
                                                    const monthTotal =
                                                        month.user_errors +
                                                        month.house_user_errors +
                                                        month.general_errors +
                                                        month.authentication_errors;

                                                    if (monthTotal === 0)
                                                        return null;

                                                    // Calculate heights based on percentages of max
                                                    const scale =
                                                        160 / maxMonthlyTotal; // 160 is the chart height (200-40)

                                                    // Each category height
                                                    const height1 =
                                                        month.user_errors *
                                                        scale;
                                                    const height2 =
                                                        month.house_user_errors *
                                                        scale;
                                                    const height3 =
                                                        month.general_errors *
                                                        scale;
                                                    const height4 =
                                                        month.authentication_errors *
                                                        scale;

                                                    // Y positions for stacking
                                                    const y1 = 200 - height1;
                                                    const y2 = y1 - height2;
                                                    const y3 = y2 - height3;
                                                    const y4 = y3 - height4;

                                                    const x =
                                                        chartStart +
                                                        i * barSpacing;

                                                    return (
                                                        <g key={`bar-${i}`}>
                                                            {/* User errors */}
                                                            {height1 > 0 && (
                                                                <rect
                                                                    x={x}
                                                                    y={y1}
                                                                    width={
                                                                        barWidth
                                                                    }
                                                                    height={
                                                                        height1
                                                                    }
                                                                    fill={
                                                                        categoryColors.user_errors
                                                                    }
                                                                    stroke="#fff"
                                                                    strokeWidth="1"
                                                                />
                                                            )}

                                                            {/* House user errors */}
                                                            {height2 > 0 && (
                                                                <rect
                                                                    x={x}
                                                                    y={y2}
                                                                    width={
                                                                        barWidth
                                                                    }
                                                                    height={
                                                                        height2
                                                                    }
                                                                    fill={
                                                                        categoryColors.house_user_errors
                                                                    }
                                                                    stroke="#fff"
                                                                    strokeWidth="1"
                                                                />
                                                            )}

                                                            {/* General errors */}
                                                            {height3 > 0 && (
                                                                <rect
                                                                    x={x}
                                                                    y={y3}
                                                                    width={
                                                                        barWidth
                                                                    }
                                                                    height={
                                                                        height3
                                                                    }
                                                                    fill={
                                                                        categoryColors.general_errors
                                                                    }
                                                                    stroke="#fff"
                                                                    strokeWidth="1"
                                                                />
                                                            )}

                                                            {/* Auth errors */}
                                                            {height4 > 0 && (
                                                                <rect
                                                                    x={x}
                                                                    y={y4}
                                                                    width={
                                                                        barWidth
                                                                    }
                                                                    height={
                                                                        height4
                                                                    }
                                                                    fill={
                                                                        categoryColors.authentication_errors
                                                                    }
                                                                    stroke="#fff"
                                                                    strokeWidth="1"
                                                                />
                                                            )}

                                                            {/* Total count label */}
                                                            <text
                                                                x={
                                                                    x +
                                                                    barWidth / 2
                                                                }
                                                                y={y4 - 5}
                                                                fontSize="10"
                                                                textAnchor="middle"
                                                                fill="#64748b"
                                                                fontWeight="bold"
                                                            >
                                                                {monthTotal}
                                                            </text>
                                                        </g>
                                                    );
                                                },
                                            )}
                                        </>
                                    );
                                })()}
                            </svg>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                        <div className="flex items-center gap-2">
                            <div
                                className="h-3 w-3 rounded-sm"
                                style={{
                                    backgroundColor: categoryColors.user_errors,
                                }}
                            ></div>
                            <span className="text-sm">User Errors</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div
                                className="h-3 w-3 rounded-sm"
                                style={{
                                    backgroundColor:
                                        categoryColors.house_user_errors,
                                }}
                            ></div>
                            <span className="text-sm">House User Errors</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div
                                className="h-3 w-3 rounded-sm"
                                style={{
                                    backgroundColor:
                                        categoryColors.general_errors,
                                }}
                            ></div>
                            <span className="text-sm">General Errors</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div
                                className="h-3 w-3 rounded-sm"
                                style={{
                                    backgroundColor:
                                        categoryColors.authentication_errors,
                                }}
                            ></div>
                            <span className="text-sm">Auth Errors</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Second row - Two card layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status distribution by category card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-5 w-5 text-[#0091D5]" />
                            Error Status by Category
                        </CardTitle>
                        <CardDescription>
                            Distribution of error statuses across categories
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-6">
                            {Object.entries(statistics.byCategoryAndStatus).map(
                                ([category, statuses]) => {
                                    const total =
                                        statuses.pending +
                                        statuses.in_progress +
                                        statuses.resolved +
                                        statuses.failure +
                                        statuses.other;
                                    if (total === 0) return null;

                                    return (
                                        <div
                                            key={category}
                                            className="flex flex-col items-center"
                                        >
                                            <h4 className="font-medium text-sm mb-2">
                                                {category
                                                    .split("_")
                                                    .map(
                                                        (word) =>
                                                            word
                                                                .charAt(0)
                                                                .toUpperCase() +
                                                            word.slice(1),
                                                    )
                                                    .join(" ")}
                                            </h4>

                                            {/* Mini pie chart for this category */}
                                            <div className="relative h-32 w-32">
                                                <svg
                                                    viewBox="0 0 100 100"
                                                    className="h-full w-full -rotate-90"
                                                >
                                                    {(() => {
                                                        // Generate pie chart segments
                                                        const segments: React.ReactElement[] =
                                                            [];
                                                        let cumulativePercentage = 0;

                                                        // Define status colors
                                                        const statusColors = {
                                                            pending: "#F59E0B",
                                                            in_progress:
                                                                "#3B82F6",
                                                            resolved: "#10B981",
                                                            failure: "#EF4444",
                                                            other: "#6B7280",
                                                        };

                                                        // Create segments for each status
                                                        Object.entries(
                                                            statuses,
                                                        ).forEach(
                                                            (
                                                                [status, count],
                                                                index,
                                                            ) => {
                                                                const percentage =
                                                                    getPercentage(
                                                                        count,
                                                                        total,
                                                                    );

                                                                if (
                                                                    percentage >
                                                                    0
                                                                ) {
                                                                    // Calculate start and end points
                                                                    const startX =
                                                                        50 +
                                                                        40 *
                                                                            Math.cos(
                                                                                (2 *
                                                                                    Math.PI *
                                                                                    cumulativePercentage) /
                                                                                    100,
                                                                            );
                                                                    const startY =
                                                                        50 +
                                                                        40 *
                                                                            Math.sin(
                                                                                (2 *
                                                                                    Math.PI *
                                                                                    cumulativePercentage) /
                                                                                    100,
                                                                            );

                                                                    cumulativePercentage +=
                                                                        percentage;

                                                                    const endX =
                                                                        50 +
                                                                        40 *
                                                                            Math.cos(
                                                                                (2 *
                                                                                    Math.PI *
                                                                                    cumulativePercentage) /
                                                                                    100,
                                                                            );
                                                                    const endY =
                                                                        50 +
                                                                        40 *
                                                                            Math.sin(
                                                                                (2 *
                                                                                    Math.PI *
                                                                                    cumulativePercentage) /
                                                                                    100,
                                                                            );

                                                                    // For segments less than 50%, use regular arcs
                                                                    const largeArcFlag =
                                                                        percentage >
                                                                        50
                                                                            ? 1
                                                                            : 0;

                                                                    segments.push(
                                                                        <path
                                                                            key={
                                                                                index
                                                                            }
                                                                            d={`M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                                                                            fill={
                                                                                statusColors[
                                                                                    status as keyof typeof statusColors
                                                                                ]
                                                                            }
                                                                            stroke="#fff"
                                                                            strokeWidth="0.5"
                                                                        />,
                                                                    );
                                                                }
                                                            },
                                                        );

                                                        // If all the same status, create a full circle
                                                        if (
                                                            segments.length ===
                                                            1
                                                        ) {
                                                            const statusWithCount =
                                                                Object.entries(
                                                                    statuses,
                                                                ).find(
                                                                    ([
                                                                        _,
                                                                        count,
                                                                    ]) =>
                                                                        count >
                                                                        0,
                                                                );
                                                            if (
                                                                statusWithCount
                                                            ) {
                                                                return (
                                                                    <circle
                                                                        cx="50"
                                                                        cy="50"
                                                                        r="40"
                                                                        fill={
                                                                            statusColors[
                                                                                statusWithCount[0] as keyof typeof statusColors
                                                                            ]
                                                                        }
                                                                        stroke="#fff"
                                                                        strokeWidth="0.5"
                                                                    />
                                                                );
                                                            }
                                                        }

                                                        return segments;
                                                    })()}

                                                    {/* Donut hole */}
                                                    <circle
                                                        cx="50"
                                                        cy="50"
                                                        r="20"
                                                        fill="white"
                                                    />
                                                </svg>

                                                {/* Center text - total count */}
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-lg font-bold text-[#1C4E80]">
                                                        {total}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        total
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Mini legend for this category */}
                                            <div className="w-full mt-2 space-y-1 text-xs">
                                                {Object.entries(statuses).map(
                                                    ([status, count]) => {
                                                        if (count === 0)
                                                            return null;

                                                        const statusColors = {
                                                            pending: "#F59E0B",
                                                            in_progress:
                                                                "#3B82F6",
                                                            resolved: "#10B981",
                                                            failure: "#EF4444",
                                                            other: "#6B7280",
                                                        };

                                                        const statusNames = {
                                                            pending: "Pending",
                                                            in_progress:
                                                                "In Progress",
                                                            resolved:
                                                                "Resolved",
                                                            failure: "Failure",
                                                            other: "Other",
                                                        };

                                                        return (
                                                            <div
                                                                key={status}
                                                                className="flex justify-between items-center"
                                                            >
                                                                <div className="flex items-center gap-1">
                                                                    <div
                                                                        className="h-2 w-2 rounded-full"
                                                                        style={{
                                                                            backgroundColor:
                                                                                statusColors[
                                                                                    status as keyof typeof statusColors
                                                                                ],
                                                                        }}
                                                                    ></div>
                                                                    <span>
                                                                        {
                                                                            statusNames[
                                                                                status as keyof typeof statusNames
                                                                            ]
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <span>
                                                                    {count} (
                                                                    {getPercentage(
                                                                        count,
                                                                        total,
                                                                    )}
                                                                    %)
                                                                </span>
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        </div>
                                    );
                                },
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Most Common Error Types */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart className="h-5 w-5 text-[#0091D5]" />
                            Most Common Error Types
                        </CardTitle>
                        <CardDescription>
                            Top error types across all categories
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {statistics.mostCommonErrorTypes
                                .slice(0, 7)
                                .map((error, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-3 w-3 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            categoryColors[
                                                                error.category
                                                            ],
                                                    }}
                                                ></div>
                                                <span
                                                    className="font-medium truncate"
                                                    style={{
                                                        maxWidth: "200px",
                                                    }}
                                                    title={error.type}
                                                >
                                                    {error.type}
                                                </span>
                                            </div>
                                            <span className="text-muted-foreground">
                                                {error.count} (
                                                {getPercentage(
                                                    error.count,
                                                    statistics.totalErrors,
                                                )}
                                                %)
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className="h-2.5 rounded-full"
                                                style={{
                                                    width: `${getPercentage(error.count, statistics.totalErrors)}%`,
                                                    backgroundColor:
                                                        categoryColors[
                                                            error.category
                                                        ],
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}

                            {statistics.mostCommonErrorTypes.length === 0 && (
                                <div className="py-8 text-center text-muted-foreground">
                                    No error type data available
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Third row - Weekday distribution */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-[#0091D5]" />
                        Error Distribution by Day of Week
                    </CardTitle>
                    <CardDescription>
                        When errors are most likely to occur
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-64">
                        <div className="h-full w-full flex items-end justify-between px-10">
                            {statistics.errorDistributionByDay.map(
                                (day, index) => {
                                    // Calculate the maximum count for scaling
                                    const maxCount = Math.max(
                                        ...statistics.errorDistributionByDay.map(
                                            (d) => d.count,
                                        ),
                                    );
                                    // Calculate height as percentage of max (up to 85% of container)
                                    const barHeight =
                                        maxCount > 0
                                            ? (day.count / maxCount) * 85
                                            : 0;

                                    // Determine color based on count (higher counts = more intense color)
                                    const intensity =
                                        maxCount > 0 ? day.count / maxCount : 0;
                                    const barColor = `rgba(0, 145, 213, ${0.3 + intensity * 0.7})`; // 0091D5 with variable opacity

                                    return (
                                        <div
                                            key={index}
                                            className="flex flex-col items-center justify-end"
                                        >
                                            {/* Bar */}
                                            <div
                                                className="w-14 rounded-t-md transition-all duration-300 hover:opacity-80"
                                                style={{
                                                    height: `${barHeight}%`,
                                                    backgroundColor: barColor,
                                                    minHeight:
                                                        day.count > 0
                                                            ? "10px"
                                                            : "0",
                                                }}
                                            >
                                                {/* Count label on top of bar */}
                                                <div className="text-center text-white font-medium pt-1">
                                                    {day.count > 0 && day.count}
                                                </div>
                                            </div>

                                            {/* Day label */}
                                            <div className="mt-2 text-sm font-medium">
                                                {day.dayOfWeek}
                                            </div>
                                        </div>
                                    );
                                },
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
