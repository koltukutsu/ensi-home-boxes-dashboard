"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ConnectivityService } from "@/lib/connectivity-service";
import { NotificationService } from "@/lib/notification-service";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from "@/registry/new-york-v4/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/registry/new-york-v4/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/registry/new-york-v4/ui/select";
import { Skeleton } from "@/registry/new-york-v4/ui/skeleton";
import { SnapshotList } from "@/components/pages/dashboard/snapshot-list";
import { LineChart, ChartData } from "@/components/pages/dashboard/charts";
import type { HomeAssistantSnapshot, Device } from "@/types/connectivity";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/registry/new-york-v4/ui/alert";
import {
    AlertCircle,
    RefreshCw,
    CalendarIcon,
    History,
    Server,
} from "lucide-react";
import { Button } from "@/registry/new-york-v4/ui/button";

// Time range options for the charts
const TIME_RANGES = [
    { label: "Last 24 hours", value: "24h" },
    { label: "Last 7 days", value: "7d" },
    { label: "Last 30 days", value: "30d" },
    { label: "All time", value: "all" },
];

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<HomeAssistantSnapshot[]>([]);
    const [timeRange, setTimeRange] = useState("all"); // Default to all time
    const [refreshing, setRefreshing] = useState(false);
    const [chartData, setChartData] = useState<{
        memoryUsage: ChartData[];
        cpuUsage: ChartData[];
        timeSeriesMemory: ChartData[];
        timeSeriesCpu: ChartData[];
    }>({
        memoryUsage: [],
        cpuUsage: [],
        timeSeriesMemory: [],
        timeSeriesCpu: [],
    });
    const [viewMode, setViewMode] = useState<"devices" | "timeline">("devices");
    const router = useRouter();
    const previousLogRef = useRef<HomeAssistantSnapshot | null>(null);

    // Function to filter logs based on selected time range
    const filterLogsByTimeRange = (logs: HomeAssistantSnapshot[]) => {
        if (timeRange === "all") return logs;

        const now = new Date();
        let cutoffDate = new Date();

        switch (timeRange) {
            case "24h":
                cutoffDate.setHours(now.getHours() - 24);
                break;
            case "7d":
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case "30d":
                cutoffDate.setDate(now.getDate() - 30);
                break;
        }

        return logs.filter((log) => {
            const logDate = new Date(log.timestamp);
            return logDate >= cutoffDate;
        });
    };

    useEffect(() => {
        // Initial data fetch to populate UI quickly
        console.log("Dashboard: Starting initial data fetch...");
        fetchInitialData();

        // Set up real-time data subscription
        console.log("Dashboard: Setting up real-time subscription...");
        const unsubscribe = ConnectivityService.subscribeToLogs((newLogs) => {
            console.log(
                `Dashboard: Subscription callback received ${newLogs.length} logs`,
            );
            if (newLogs.length > 0) {
                // Sort logs by timestamp (newest first)
                const sortedLogs = [...newLogs].sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime(),
                );

                setLogs(sortedLogs);
                setError(null);

                // Check for changes and notify if needed
                if (previousLogRef.current) {
                    NotificationService.notifyChanges(
                        sortedLogs[0],
                        previousLogRef.current,
                    );
                } else {
                    NotificationService.notifyNewData(sortedLogs[0]);
                }

                // Update ref for next comparison
                previousLogRef.current = sortedLogs[0];

                // Generate chart data
                updateChartData(sortedLogs);
            } else {
                console.log("Dashboard: No logs received from subscription");
                setError(
                    "No connectivity logs found. Please check your configuration.",
                );
            }

            if (loading) {
                console.log("Dashboard: Setting loading state to false");
                setLoading(false);
            }
        });

        return () => {
            console.log("Dashboard: Cleaning up subscription");
            unsubscribe();
        };
    }, []);

    // Update chart data when time range changes
    useEffect(() => {
        if (logs.length > 0) {
            updateChartData(logs);
        }
    }, [timeRange]);

    const fetchInitialData = async () => {
        try {
            console.log("Dashboard: fetchInitialData started");
            setRefreshing(true);
            const logsData = await ConnectivityService.getAllLogs();
            console.log(
                `Dashboard: getAllLogs returned ${logsData.length} logs`,
            );

            if (logsData.length > 0) {
                console.log("Dashboard: Processing logs data");

                // Sort logs by timestamp (newest first)
                const sortedLogs = [...logsData].sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime(),
                );

                setLogs(sortedLogs);
                setError(null);

                // Store the first log for later comparison
                previousLogRef.current = sortedLogs[0];

                // Display initial notifications
                NotificationService.notifyNewData(sortedLogs[0]);

                // Generate chart data for all logs
                updateChartData(sortedLogs);
            } else {
                console.log("Dashboard: No logs data received");
                setError(
                    "No connectivity logs found. Please check your configuration.",
                );
            }
        } catch (error: any) {
            console.error("Dashboard: Error in fetchInitialData:", error);
            setError(`Error fetching data: ${error.message}`);
        } finally {
            console.log("Dashboard: Finalizing fetchInitialData");
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        fetchInitialData();
    };

    const updateChartData = (logsData: HomeAssistantSnapshot[]) => {
        // Filter logs by time range
        const filteredLogs = filterLogsByTimeRange(logsData);

        // Filter logs to include only those with valid CPU and memory data
        const logsWithValidData = filteredLogs.filter(
            (log) =>
                typeof log.system_memory_percent === "number" &&
                typeof log.system_cpu_percent === "number",
        );

        if (logsWithValidData.length === 0) {
            // No valid data available
            setChartData({
                memoryUsage: [],
                cpuUsage: [],
                timeSeriesMemory: [],
                timeSeriesCpu: [],
            });
            return;
        }

        // Group by device ID to get one entry per device with the most recent data
        const deviceMap = new Map<string, HomeAssistantSnapshot>();
        logsWithValidData.forEach((log) => {
            const deviceId = log.deviceId || "unknown";
            // Only keep the most recent log for each device
            if (
                !deviceMap.has(deviceId) ||
                new Date(log.timestamp).getTime() >
                    new Date(deviceMap.get(deviceId)!.timestamp).getTime()
            ) {
                deviceMap.set(deviceId, log);
            }
        });

        // Convert to arrays for memory and CPU data
        const memoryData: ChartData[] = [];
        const cpuData: ChartData[] = [];

        // Add device data points
        Array.from(deviceMap.values()).forEach((log) => {
            memoryData.push({
                name: log.deviceId || formatDate(log.timestamp),
                value: log.system_memory_percent || 0,
                device: log.deviceId || "unknown",
            });

            cpuData.push({
                name: log.deviceId || formatDate(log.timestamp),
                value: log.system_cpu_percent || 0,
                device: log.deviceId || "unknown",
            });
        });

        // Add average data point based on the most recent data for each device
        if (memoryData.length > 0) {
            const avgMemory =
                memoryData.reduce((sum, item) => sum + item.value, 0) /
                memoryData.length;
            memoryData.push({
                name: "Average",
                value: Number(avgMemory.toFixed(1)),
                device: "average",
            });
        }

        if (cpuData.length > 0) {
            const avgCpu =
                cpuData.reduce((sum, item) => sum + item.value, 0) /
                cpuData.length;
            cpuData.push({
                name: "Average",
                value: Number(avgCpu.toFixed(1)),
                device: "average",
            });
        }

        // Create time series data - organize chronologically
        // Group by device ID, but maintain timestamp
        const deviceMemoryMap: Record<
            string,
            { timestamps: string[]; values: number[] }
        > = {};
        const deviceCpuMap: Record<
            string,
            { timestamps: string[]; values: number[] }
        > = {};

        // For each device, collect its resource usage over time
        logsWithValidData.forEach((log) => {
            const deviceId = log.deviceId || "unknown";
            const timestamp = formatDate(log.timestamp);
            const memValue = log.system_memory_percent || 0;
            const cpuValue = log.system_cpu_percent || 0;

            if (!deviceMemoryMap[deviceId]) {
                deviceMemoryMap[deviceId] = { timestamps: [], values: [] };
            }
            if (!deviceCpuMap[deviceId]) {
                deviceCpuMap[deviceId] = { timestamps: [], values: [] };
            }

            deviceMemoryMap[deviceId].timestamps.push(timestamp);
            deviceMemoryMap[deviceId].values.push(memValue);

            deviceCpuMap[deviceId].timestamps.push(timestamp);
            deviceCpuMap[deviceId].values.push(cpuValue);
        });

        // Convert to chart data format for time series
        const timeSeriesMemory: ChartData[] = [];
        const timeSeriesCpu: ChartData[] = [];

        // Convert each device's time series to chart data
        Object.entries(deviceMemoryMap).forEach(([deviceId, data]) => {
            data.timestamps.forEach((timestamp, index) => {
                timeSeriesMemory.push({
                    name: timestamp,
                    value: data.values[index],
                    device: deviceId,
                });
            });
        });

        Object.entries(deviceCpuMap).forEach(([deviceId, data]) => {
            data.timestamps.forEach((timestamp, index) => {
                timeSeriesCpu.push({
                    name: timestamp,
                    value: data.values[index],
                    device: deviceId,
                });
            });
        });

        // Sort by timestamp
        timeSeriesMemory.sort(
            (a, b) => new Date(a.name).getTime() - new Date(b.name).getTime(),
        );
        timeSeriesCpu.sort(
            (a, b) => new Date(a.name).getTime() - new Date(b.name).getTime(),
        );

        setChartData({
            memoryUsage: memoryData,
            cpuUsage: cpuData,
            timeSeriesMemory,
            timeSeriesCpu,
        });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
        });
    };

    // Calculate average CPU and memory usage across filtered snapshots
    const getAverageCpuUsage = (filteredLogs = logs) => {
        if (filteredLogs.length === 0) return "0";
        const total = filteredLogs.reduce(
            (sum, log) => sum + (log.system_cpu_percent || 0),
            0,
        );
        return (total / filteredLogs.length).toFixed(1);
    };

    const getAverageMemoryUsage = (filteredLogs = logs) => {
        if (filteredLogs.length === 0) return "0";
        const total = filteredLogs.reduce(
            (sum, log) => sum + (log.system_memory_percent || 0),
            0,
        );
        return (total / filteredLogs.length).toFixed(1);
    };

    // Get average device metrics across all home boxes
    const getDeviceAverages = () => {
        if (logs.length === 0) return { cpu: 0, memory: 0, count: 0 };

        // Collect all unique devices
        const uniqueDevices = new Map();
        let totalCpu = 0;
        let totalMemory = 0;
        let deviceCount = 0;

        logs.forEach((log) => {
            if (log.devices_devices) {
                log.devices_devices.forEach((device) => {
                    if (!uniqueDevices.has(device.id)) {
                        uniqueDevices.set(device.id, device);

                        // Assume device CPU/memory can be derived from entities if available
                        // This is a simplification - in a real app you'd have per-device metrics
                        totalCpu += device.entities.length > 0 ? 2 : 0; // Example calculation
                        totalMemory += device.entities.length * 5; // Example calculation
                        deviceCount++;
                    }
                });
            }
        });

        return {
            cpu: deviceCount > 0 ? (totalCpu / deviceCount).toFixed(1) : 0,
            memory:
                deviceCount > 0 ? (totalMemory / deviceCount).toFixed(1) : 0,
            count: deviceCount,
        };
    };

    const getTotalDeviceCount = () => {
        // Count unique devices by ID across all snapshots
        const uniqueDeviceIds = new Set();

        logs.forEach((log) => {
            if (log.devices_devices) {
                log.devices_devices.forEach((device) => {
                    uniqueDeviceIds.add(device.id);
                });
            }
        });

        return uniqueDeviceIds.size;
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">WatchDash</h1>
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-6">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-24 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card className="mb-6">
                    <CardHeader>
                        <Skeleton className="h-6 w-1/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Get the filtered logs based on the selected time range
    const filteredLogs = filterLogsByTimeRange(logs);

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Ensi Dashboard</h1>
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

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8">
                {/* Summary Cards */}
                <Card className="bg-gradient-to-br from-[#F1F1F1] to-white dark:from-[#202020] dark:to-[#1e1e1e] shadow-md border-[#A5D8DD] dark:border-[#1C4E80]">
                    <CardHeader className="pb-2">
                        <CardTitle>Ensi Home Boxes</CardTitle>
                        <CardDescription>Monitored systems</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-[#1C4E80] dark:text-[#0091D5]">
                            {logs.length}
                        </div>
                        <p className="text-muted-foreground text-sm mt-2">
                            Connected Ensi Home Boxes
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-[#F1F1F1] to-white dark:from-[#202020] dark:to-[#1e1e1e] shadow-md border-[#A5D8DD] dark:border-[#1C4E80]">
                    <CardHeader className="pb-2">
                        <CardTitle>Devices</CardTitle>
                        <CardDescription>Connected devices</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-[#1C4E80] dark:text-[#0091D5]">
                            {getTotalDeviceCount()}
                        </div>
                        <p className="text-muted-foreground text-sm mt-2">
                            Unique devices across all Ensi Home Boxes
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-[#F1F1F1] to-white dark:from-[#202020] dark:to-[#1e1e1e] shadow-md border-[#A5D8DD] dark:border-[#1C4E80]">
                    <CardHeader className="pb-2">
                        <CardTitle>System Load</CardTitle>
                        <CardDescription>
                            Average system metrics
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-sm font-medium">CPU</div>
                                <div className="text-2xl font-bold text-[#1C4E80] dark:text-[#0091D5]">
                                    {getAverageCpuUsage(filteredLogs)}%
                                </div>
                            </div>
                            <div>
                                <div className="text-sm font-medium">
                                    Memory
                                </div>
                                <div className="text-2xl font-bold text-[#1C4E80] dark:text-[#0091D5]">
                                    {getAverageMemoryUsage(filteredLogs)}%
                                </div>
                            </div>
                            <div>
                                <div className="text-sm font-medium">
                                    Last Update
                                </div>
                                <div className="text-sm font-bold text-[#1C4E80] dark:text-[#0091D5]">
                                    {logs.length > 0
                                        ? formatDate(logs[0].timestamp || "")
                                        : "Unknown"}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Machine Data Availability Info */}
            <div className="mb-4 p-3 bg-muted/30 rounded-md">
                <h3 className="text-sm font-medium mb-2">
                    Data Availability for Resource Calculations:
                </h3>
                {(() => {
                    // Analyze which machines have CPU and memory data
                    const machineDataStatus = logs.reduce(
                        (acc, log) => {
                            const deviceId = log.deviceId || "unknown";
                            if (!acc[deviceId]) {
                                acc[deviceId] = {
                                    hasCpuData:
                                        typeof log.system_cpu_percent ===
                                        "number",
                                    hasMemoryData:
                                        typeof log.system_memory_percent ===
                                        "number",
                                    name: deviceId,
                                };
                            }
                            return acc;
                        },
                        {} as Record<
                            string,
                            {
                                hasCpuData: boolean;
                                hasMemoryData: boolean;
                                name: string;
                            }
                        >,
                    );

                    const withData = Object.values(machineDataStatus).filter(
                        (m) => m.hasCpuData && m.hasMemoryData,
                    );
                    const withoutData = Object.values(machineDataStatus).filter(
                        (m) => !m.hasCpuData || !m.hasMemoryData,
                    );

                    return (
                        <div className="text-sm">
                            <p>
                                <span className="font-medium text-green-600 dark:text-green-400">
                                    {withData.length}
                                </span>{" "}
                                machines included in calculations:{" "}
                                {withData.map((m) => m.name).join(", ")}
                            </p>
                            {withoutData.length > 0 && (
                                <p className="mt-1">
                                    <span className="font-medium text-amber-600 dark:text-amber-400">
                                        {withoutData.length}
                                    </span>{" "}
                                    machines excluded due to missing data:{" "}
                                    {withoutData.map((m) => m.name).join(", ")}
                                </p>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Time Range Selector */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Button
                        variant={viewMode === "devices" ? "default" : "outline"}
                        onClick={() => setViewMode("devices")}
                        size="sm"
                        className="flex items-center gap-1"
                    >
                        <Server className="h-4 w-4" />
                        By Device
                    </Button>
                    <Button
                        variant={
                            viewMode === "timeline" ? "default" : "outline"
                        }
                        onClick={() => setViewMode("timeline")}
                        size="sm"
                        className="flex items-center gap-1"
                    >
                        <History className="h-4 w-4" />
                        Timeline
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                            {TIME_RANGES.map((range) => (
                                <SelectItem
                                    key={range.value}
                                    value={range.value}
                                >
                                    {range.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Charts */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mb-8">
                {viewMode === "devices" ? (
                    /* Device-based charts */
                    <>
                        <Card className="shadow-md border-[#A5D8DD] dark:border-[#1C4E80]">
                            <CardHeader>
                                <CardTitle>Memory Usage</CardTitle>
                                <CardDescription>
                                    Memory usage by Ensi Home Box
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {chartData.memoryUsage.length > 0 ? (
                                    <LineChart
                                        data={chartData.memoryUsage}
                                        categories={["value"]}
                                        index="name"
                                        colors={["#0091D5"]}
                                        valueFormatter={(value) =>
                                            `${value.toFixed(2)}%`
                                        }
                                        className="h-64"
                                    />
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                                        No memory usage data available
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="text-xs text-muted-foreground">
                                {chartData.memoryUsage.length > 0 ? (
                                    <>
                                        Showing{" "}
                                        {
                                            chartData.memoryUsage.filter(
                                                (item) =>
                                                    item.name !== "Average",
                                            ).length
                                        }{" "}
                                        Ensi Home Boxes with valid memory data.
                                        <span className="ml-1 font-medium">
                                            Average:{" "}
                                            {chartData.memoryUsage
                                                .find(
                                                    (item) =>
                                                        item.name === "Average",
                                                )
                                                ?.value.toFixed(1)}
                                            %
                                        </span>
                                    </>
                                ) : (
                                    "No device data available"
                                )}
                            </CardFooter>
                        </Card>

                        <Card className="shadow-md border-[#A5D8DD] dark:border-[#1C4E80]">
                            <CardHeader>
                                <CardTitle>CPU Usage</CardTitle>
                                <CardDescription>
                                    CPU usage by Ensi Home Box
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {chartData.cpuUsage.length > 0 ? (
                                    <LineChart
                                        data={chartData.cpuUsage}
                                        categories={["value"]}
                                        index="name"
                                        colors={["#1C4E80"]}
                                        valueFormatter={(value) =>
                                            `${value.toFixed(2)}%`
                                        }
                                        className="h-64"
                                    />
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                                        No CPU usage data available
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="text-xs text-muted-foreground">
                                {chartData.cpuUsage.length > 0 ? (
                                    <>
                                        Showing{" "}
                                        {
                                            chartData.cpuUsage.filter(
                                                (item) =>
                                                    item.name !== "Average",
                                            ).length
                                        }{" "}
                                        Ensi Home Boxes with valid CPU data.
                                        <span className="ml-1 font-medium">
                                            Average:{" "}
                                            {chartData.cpuUsage
                                                .find(
                                                    (item) =>
                                                        item.name === "Average",
                                                )
                                                ?.value.toFixed(1)}
                                            %
                                        </span>
                                    </>
                                ) : (
                                    "No device data available"
                                )}
                            </CardFooter>
                        </Card>
                    </>
                ) : (
                    /* Timeline-based charts */
                    <>
                        <Card className="shadow-md border-[#A5D8DD] dark:border-[#1C4E80]">
                            <CardHeader>
                                <CardTitle>Memory Usage Over Time</CardTitle>
                                <CardDescription>
                                    Historical memory usage trends
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {chartData.timeSeriesMemory.length > 0 ? (
                                    <LineChart
                                        data={chartData.timeSeriesMemory}
                                        categories={["value"]}
                                        index="name"
                                        colors={["#0091D5"]}
                                        valueFormatter={(value) =>
                                            `${value.toFixed(2)}%`
                                        }
                                        className="h-64"
                                    />
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                                        No historical memory data available
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="text-xs text-muted-foreground">
                                {chartData.timeSeriesMemory.length > 0
                                    ? `Showing historical memory usage (${
                                          timeRange === "all"
                                              ? "All time"
                                              : TIME_RANGES.find(
                                                    (r) =>
                                                        r.value === timeRange,
                                                )?.label
                                      }) for ${new Set(chartData.timeSeriesMemory.map((item) => item.device)).size} devices`
                                    : "No historical data available"}
                            </CardFooter>
                        </Card>

                        <Card className="shadow-md border-[#A5D8DD] dark:border-[#1C4E80]">
                            <CardHeader>
                                <CardTitle>CPU Usage Over Time</CardTitle>
                                <CardDescription>
                                    Historical CPU usage trends
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {chartData.timeSeriesCpu.length > 0 ? (
                                    <LineChart
                                        data={chartData.timeSeriesCpu}
                                        categories={["value"]}
                                        index="name"
                                        colors={["#1C4E80"]}
                                        valueFormatter={(value) =>
                                            `${value.toFixed(2)}%`
                                        }
                                        className="h-64"
                                    />
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                                        No historical CPU data available
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="text-xs text-muted-foreground">
                                {chartData.timeSeriesCpu.length > 0
                                    ? `Showing historical CPU usage (${
                                          timeRange === "all"
                                              ? "All time"
                                              : TIME_RANGES.find(
                                                    (r) =>
                                                        r.value === timeRange,
                                                )?.label
                                      }) for ${new Set(chartData.timeSeriesCpu.map((item) => item.device)).size} devices`
                                    : "No historical data available"}
                            </CardFooter>
                        </Card>
                    </>
                )}
            </div>

            {/* Device Averages */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Device Averages</h2>
                <p className="text-muted-foreground mb-4">
                    This section shows average metrics for all devices across
                    all Ensi Home Boxes
                </p>

                <div className="grid gap-6 grid-cols-1 md:grid-cols-3 lg:grid-cols-3">
                    {/* Average metrics cards */}
                    <Card className="bg-gradient-to-br from-[#F5F5F5] to-white dark:from-[#252525] dark:to-[#1e1e1e] shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">
                                Average Entities
                            </CardTitle>
                            <CardDescription>Per device</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {(() => {
                                // Calculate average entities per device
                                if (logs.length === 0) return 0;
                                const uniqueDevices = new Map();
                                let totalEntities = 0;

                                logs.forEach((log) => {
                                    if (log.devices_devices) {
                                        log.devices_devices.forEach(
                                            (device) => {
                                                if (
                                                    !uniqueDevices.has(
                                                        device.id,
                                                    )
                                                ) {
                                                    uniqueDevices.set(
                                                        device.id,
                                                        true,
                                                    );
                                                    totalEntities +=
                                                        device.entity_count ||
                                                        0;
                                                }
                                            },
                                        );
                                    }
                                });

                                const avgEntities =
                                    uniqueDevices.size > 0
                                        ? (
                                              totalEntities / uniqueDevices.size
                                          ).toFixed(1)
                                        : "0";

                                return (
                                    <div className="text-3xl font-bold text-[#1C4E80] dark:text-[#0091D5]">
                                        {avgEntities}
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-[#F5F5F5] to-white dark:from-[#252525] dark:to-[#1e1e1e] shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">
                                Devices by Status
                            </CardTitle>
                            <CardDescription>
                                Enabled vs disabled
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {(() => {
                                // Calculate enabled vs disabled devices
                                if (logs.length === 0) return null;
                                const uniqueDevices = new Map();
                                let enabledCount = 0;
                                let disabledCount = 0;

                                logs.forEach((log) => {
                                    if (log.devices_devices) {
                                        log.devices_devices.forEach(
                                            (device) => {
                                                if (
                                                    !uniqueDevices.has(
                                                        device.id,
                                                    )
                                                ) {
                                                    uniqueDevices.set(
                                                        device.id,
                                                        true,
                                                    );
                                                    if (device.disabled) {
                                                        disabledCount++;
                                                    } else {
                                                        enabledCount++;
                                                    }
                                                }
                                            },
                                        );
                                    }
                                });

                                return (
                                    <div className="flex items-center justify-around">
                                        <div className="text-center">
                                            <div className="text-sm font-medium text-muted-foreground">
                                                Enabled
                                            </div>
                                            <div className="text-2xl font-bold text-green-500">
                                                {enabledCount}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm font-medium text-muted-foreground">
                                                Disabled
                                            </div>
                                            <div className="text-2xl font-bold text-red-500">
                                                {disabledCount}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-[#F5F5F5] to-white dark:from-[#252525] dark:to-[#1e1e1e] shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">
                                Device Distribution
                            </CardTitle>
                            <CardDescription>
                                Devices per Home Box
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {(() => {
                                // Calculate average devices per Home Box
                                if (logs.length === 0) return 0;

                                const totalDevices = getTotalDeviceCount();
                                const avgDevicesPerBox =
                                    logs.length > 0
                                        ? (totalDevices / logs.length).toFixed(
                                              1,
                                          )
                                        : "0";

                                return (
                                    <>
                                        <div className="text-3xl font-bold text-[#1C4E80] dark:text-[#0091D5]">
                                            {avgDevicesPerBox}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Average devices per Ensi Home Box
                                        </p>
                                    </>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Snapshots List */}
            <Tabs defaultValue="snapshots" className="mb-8">
                <TabsList className="mb-4">
                    <TabsTrigger value="snapshots">Ensi Home Boxes</TabsTrigger>
                    <TabsTrigger value="addons">Add-ons</TabsTrigger>
                </TabsList>
                <TabsContent value="snapshots">
                    <SnapshotList snapshots={filteredLogs} />
                </TabsContent>
                <TabsContent value="addons">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Add-ons</CardTitle>
                            <CardDescription>
                                Installed add-ons across all Ensi Home Boxes
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {logs.length > 0 &&
                            logs.some(
                                (log) =>
                                    log.supervisor_addons &&
                                    log.supervisor_addons.length > 0,
                            ) ? (
                                <div className="rounded-md border">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="p-3 text-left font-medium">
                                                    Home Box
                                                </th>
                                                <th className="p-3 text-left font-medium">
                                                    Name
                                                </th>
                                                <th className="p-3 text-left font-medium">
                                                    Version
                                                </th>
                                                <th className="p-3 text-left font-medium">
                                                    CPU
                                                </th>
                                                <th className="p-3 text-left font-medium">
                                                    Memory
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {logs.flatMap((log) =>
                                                (
                                                    log.supervisor_addons || []
                                                ).map((addon, index) => (
                                                    <tr
                                                        key={`${log.deviceId || log.timestamp}-${addon.slug}`}
                                                        className={
                                                            index % 2 === 0
                                                                ? "bg-background"
                                                                : "bg-muted/20"
                                                        }
                                                    >
                                                        <td className="p-3">
                                                            {log.deviceId ||
                                                                formatDate(
                                                                    log.timestamp,
                                                                )}
                                                        </td>
                                                        <td className="p-3 font-medium">
                                                            {addon.name}
                                                        </td>
                                                        <td className="p-3">
                                                            {addon.version}
                                                        </td>
                                                        <td className="p-3">
                                                            {addon.cpu_percent
                                                                ? `${addon.cpu_percent}%`
                                                                : "N/A"}
                                                        </td>
                                                        <td className="p-3">
                                                            {addon.memory_usage &&
                                                            addon.memory_limit
                                                                ? `${Math.round(addon.memory_usage / (1024 * 1024))}MB / ${Math.round(addon.memory_limit / (1024 * 1024))}MB`
                                                                : "N/A"}
                                                        </td>
                                                    </tr>
                                                )),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center p-6 text-muted-foreground">
                                    No add-ons data available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
