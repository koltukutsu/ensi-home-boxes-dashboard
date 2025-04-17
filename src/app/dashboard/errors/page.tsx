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
import { formatDistanceToNow, subDays, format } from "date-fns";
import { doc, updateDoc } from "firebase/firestore";
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
                    const errDate = err.timestamp.toDate
                        ? err.timestamp.toDate()
                        : new Date(err.timestamp.toDate());
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
                            : new Date(err.timestamp.toDate());
                        const resolvedAt = (err as any).resolvedAt;
                        // Convert Firebase Timestamp to Date if needed
                        const resolvedDate = resolvedAt.toDate
                            ? resolvedAt.toDate()
                            : new Date(resolvedAt);

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

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Error Logs</h1>
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
