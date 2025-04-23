"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ConnectivityService } from "@/lib/connectivity-service";
import { getHouseData, HouseData } from "@/lib/firebase-utils";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from "@/registry/new-york-v4/ui/card";
import { Badge } from "@/registry/new-york-v4/ui/badge";
import { Button } from "@/registry/new-york-v4/ui/button";
import { Skeleton } from "@/registry/new-york-v4/ui/skeleton";
import { ArrowLeft, Clock, Server, BarChart, PieChart, LineChart, Search, Filter, X } from "lucide-react";
import type { Device, Entity } from "@/types/connectivity";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/registry/new-york-v4/ui/table";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/registry/new-york-v4/ui/tabs";
import {
    Laptop,
    Smartphone,
    Router,
    Tv,
    HardDrive,
    Server as ServerIcon,
    Cpu,
} from "lucide-react";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/registry/new-york-v4/ui/alert";
import { AlertCircle } from "lucide-react";
import type { HomeAssistantSnapshot } from "@/types/connectivity";
import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/registry/new-york-v4/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/registry/new-york-v4/ui/select";
import { Input } from "@/registry/new-york-v4/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/registry/new-york-v4/ui/dropdown-menu";
import {
    BarChart as BarChartComponent,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart as PieChartComponent,
    Pie,
    Cell,
    LineChart as LineChartComponent,
    Line,
} from "recharts";

export default function DeviceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [snapshot, setSnapshot] = useState<HomeAssistantSnapshot | null>(
        null,
    );
    const [devices, setDevices] = useState<Device[]>([]);
    const [houseData, setHouseData] = useState<HouseData | null>(null);
    const [historicalLogs, setHistoricalLogs] = useState<HomeAssistantSnapshot[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<HomeAssistantSnapshot | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortField, setSortField] = useState<string>("timestamp");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    
    // Device table sorting state
    const [deviceSortField, setDeviceSortField] = useState<string>("name");
    const [deviceSortDirection, setDeviceSortDirection] = useState<"asc" | "desc">("asc");
    
    // Connection types sorting state
    const [connectionSortField, setConnectionSortField] = useState<string>("type");
    const [connectionSortDirection, setConnectionSortDirection] = useState<"asc" | "desc">("asc");
    
    // Add-ons sorting state
    const [addonSortField, setAddonSortField] = useState<string>("name");
    const [addonSortDirection, setAddonSortDirection] = useState<"asc" | "desc">("asc");

    useEffect(() => {
        async function fetchData() {
            try {
                const deviceId = params.id as string;
                if (!deviceId) {
                    setError("Invalid device ID");
                    setLoading(false);
                    return;
                }

                // Get all snapshots
                const allSnapshots = await ConnectivityService.getAllLogs();

                // Find the specific snapshot with the matching deviceId
                const matchingSnapshot = allSnapshots.find(
                    (s) => s.deviceId === deviceId,
                );

                if (!matchingSnapshot) {
                    setError("Snapshot not found");
                    setLoading(false);
                    return;
                }

                setSnapshot(matchingSnapshot);

                // Get all devices from this snapshot
                if (matchingSnapshot.devices_devices) {
                    setDevices(matchingSnapshot.devices_devices);
                }

                // Fetch house data using the device ID
                const houseDetails = await getHouseData(deviceId);
                setHouseData(houseDetails);

                // Fetch historical logs for this device
                await fetchHistoricalLogs(deviceId);

                setLoading(false);
            } catch (error: any) {
                console.error("Error fetching device details:", error);
                setError(`Error: ${error.message}`);
                setLoading(false);
            }
        }

        fetchData();
    }, [params.id]);

    // Function to fetch historical logs for the device
    async function fetchHistoricalLogs(deviceId: string) {
        try {
            // Reference to the logs subcollection for this device
            const deviceDocRef = collection(db, "connectivity_logs", deviceId, "logs");
            
            // Create a query to get all logs ordered by timestamp in descending order
            const logsQuery = query(
                deviceDocRef,
                orderBy("timestamp", "desc"),
                limit(250) // Increased to 250 as requested
            );
            
            const logsSnapshot = await getDocs(logsQuery);
            
            if (!logsSnapshot.empty) {
                const logs: HomeAssistantSnapshot[] = [];
                
                logsSnapshot.forEach((doc) => {
                    const logData = doc.data() as HomeAssistantSnapshot;
                    logs.push({
                        ...logData,
                        timestamp: logData.timestamp || new Date().toISOString(),
                        deviceId: deviceId,
                    });
                });
                
                setHistoricalLogs(logs);
                
                // If we don't have a selected log yet, select the most recent one (which should be the current snapshot)
                if (!selectedLog && logs.length > 0) {
                    setSelectedLog(logs[0]);
                }
            }
        } catch (error) {
            console.error("Error fetching historical logs:", error);
        }
    }

    const goBack = () => {
        router.back();
    };

    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return "N/A";
        const date = new Date(dateStr);
        return date.toLocaleString();
    };

    const formatBytes = (bytes: number | undefined, decimals = 2) => {
        if (!bytes) return "N/A";

        if (bytes === 0) return "0 Bytes";

        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return (
            parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) +
            " " +
            sizes[i]
        );
    };

    const getDeviceIcon = (device: Device) => {
        const name = device.name.toLowerCase();
        if (name.includes("tv") || name.includes("television")) {
            return <Tv className="h-4 w-4 text-[#1C4E80]" />;
        } else if (name.includes("phone") || name.includes("mobile")) {
            return <Smartphone className="h-4 w-4 text-[#1C4E80]" />;
        } else if (name.includes("router") || name.includes("network")) {
            return <Router className="h-4 w-4 text-[#1C4E80]" />;
        } else if (name.includes("server") || name.includes("nas")) {
            return <HardDrive className="h-4 w-4 text-[#1C4E80]" />;
        } else {
            return <Laptop className="h-4 w-4 text-[#1C4E80]" />;
        }
    };

    // Filter logs based on search query
    const filteredLogs = useMemo(() => {
        if (!searchQuery.trim()) return historicalLogs;
        
        return historicalLogs.filter(log => {
            const timestamp = new Date(log.timestamp).toLocaleString().toLowerCase();
            const query = searchQuery.toLowerCase();
            
            return timestamp.includes(query) || 
                   (log.system_cpu_percent?.toString().includes(query)) ||
                   (log.system_memory_percent?.toString().includes(query));
        });
    }, [historicalLogs, searchQuery]);
    
    // Sort logs based on selected field and direction
    const sortedLogs = useMemo(() => {
        return [...filteredLogs].sort((a, b) => {
            let aValue: any;
            let bValue: any;
            
            switch (sortField) {
                case "timestamp":
                    aValue = new Date(a.timestamp).getTime();
                    bValue = new Date(b.timestamp).getTime();
                    break;
                case "cpu":
                    aValue = a.system_cpu_percent || 0;
                    bValue = b.system_cpu_percent || 0;
                    break;
                case "memory":
                    aValue = a.system_memory_percent || 0;
                    bValue = b.system_memory_percent || 0;
                    break;
                case "devices":
                    aValue = a.devices_devices?.length || 0;
                    bValue = b.devices_devices?.length || 0;
                    break;
                default:
                    aValue = new Date(a.timestamp).getTime();
                    bValue = new Date(b.timestamp).getTime();
            }
            
            return sortDirection === "asc" 
                ? aValue - bValue 
                : bValue - aValue;
        });
    }, [filteredLogs, sortField, sortDirection]);
    
    // Format date for chart display
    const formatChartDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString(undefined, {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Prepare chart data for CPU usage over time
    const cpuChartData = useMemo(() => {
        // Sort all logs chronologically
        return [...historicalLogs]
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .map(log => ({
                name: formatChartDate(log.timestamp),
                dateTime: log.timestamp, // Store the full date for tooltip
                value: log.system_cpu_percent || 0
            }));
    }, [historicalLogs]);
    
    // Prepare chart data for memory usage over time
    const memoryChartData = useMemo(() => {
        return [...historicalLogs]
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .map(log => ({
                name: formatChartDate(log.timestamp),
                dateTime: log.timestamp, // Store the full date for tooltip
                value: log.system_memory_percent || 0
            }));
    }, [historicalLogs]);
    
    // Prepare pie chart data for device categories
    const deviceCategoriesData = useMemo(() => {
        if (!snapshot || !snapshot.devices_devices) return [];
        
        const categories: Record<string, number> = {
            "Network": 0,
            "Media": 0,
            "Sensors": 0,
            "Other": 0
        };
        
        snapshot.devices_devices.forEach((device) => {
            const name = (device.name || "").toLowerCase();
            const model = (device.model || "").toLowerCase();
            
            if (name.includes("router") || name.includes("network") || 
                model.includes("router") || model.includes("network")) {
                categories["Network"]++;
            } else if (name.includes("tv") || name.includes("media") || 
                      model.includes("tv") || model.includes("media")) {
                categories["Media"]++;
            } else if (name.includes("sensor") || name.includes("temperature") || 
                      model.includes("sensor")) {
                categories["Sensors"]++;
            } else {
                categories["Other"]++;
            }
        });
        
        return Object.entries(categories)
            .filter(([_, count]) => count > 0)
            .map(([name, value]) => ({ name, value }));
    }, [snapshot]);
    
    // Handle selecting a specific log for viewing
    const handleSelectLog = (log: HomeAssistantSnapshot) => {
        setSelectedLog(log);
        setDialogOpen(false);
    };

    // Sort devices based on selected field and direction
    const sortedDevices = useMemo(() => {
        return [...devices].sort((a, b) => {
            let aValue: any;
            let bValue: any;
            
            switch (deviceSortField) {
                case "name":
                    aValue = a.name?.toLowerCase() || "";
                    bValue = b.name?.toLowerCase() || "";
                    break;
                case "manufacturer":
                    aValue = a.manufacturer?.toLowerCase() || "";
                    bValue = b.manufacturer?.toLowerCase() || "";
                    break;
                case "model":
                    aValue = a.model?.toLowerCase() || "";
                    bValue = b.model?.toLowerCase() || "";
                    break;
                case "entities":
                    aValue = a.entity_count || 0;
                    bValue = b.entity_count || 0;
                    break;
                case "status":
                    aValue = a.disabled ? 1 : 0;
                    bValue = b.disabled ? 1 : 0;
                    break;
                default:
                    aValue = a.name?.toLowerCase() || "";
                    bValue = b.name?.toLowerCase() || "";
            }
            
            // For string comparisons
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return deviceSortDirection === "asc" 
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }
            
            // For numeric comparisons
            return deviceSortDirection === "asc" 
                ? aValue - bValue 
                : bValue - aValue;
        });
    }, [devices, deviceSortField, deviceSortDirection]);
    
    // Handle column header click for device table
    const handleDeviceSort = (field: string) => {
        if (deviceSortField === field) {
            // Toggle direction if clicking the same field
            setDeviceSortDirection(deviceSortDirection === "asc" ? "desc" : "asc");
        } else {
            // Set new field and default to ascending
            setDeviceSortField(field);
            setDeviceSortDirection("asc");
        }
    };
    
    // Helper to render sort indicators
    const renderSortIndicator = (field: string) => {
        if (deviceSortField !== field) return null;
        
        return deviceSortDirection === "asc" 
            ? <span className="ml-1">↑</span> 
            : <span className="ml-1">↓</span>;
    };

    // Handle connection type sort
    const handleConnectionSort = (field: string) => {
        if (connectionSortField === field) {
            // Toggle direction if clicking the same field
            setConnectionSortDirection(connectionSortDirection === "asc" ? "desc" : "asc");
        } else {
            // Set new field and default to ascending
            setConnectionSortField(field);
            setConnectionSortDirection("asc");
        }
    };
    
    // Helper to render connection sort indicators
    const renderConnectionSortIndicator = (field: string) => {
        if (connectionSortField !== field) return null;
        
        return connectionSortDirection === "asc" 
            ? <span className="ml-1">↑</span> 
            : <span className="ml-1">↓</span>;
    };
    
    // Function to sort connection types
    const getSortedConnectionTypes = (devices: Device[]) => {
        const connectionTypes = new Map();
        
        // Count connection types
        devices.forEach((device) => {
            if (device.connections && device.connections.length > 0) {
                device.connections.forEach((conn) => {
                    const type = conn[0] || "unknown";
                    connectionTypes.set(type, (connectionTypes.get(type) || 0) + 1);
                });
            }
        });
        
        // Convert to array for sorting
        const typesArray = Array.from(connectionTypes.entries()).map(([type, count]) => ({
            type,
            count: count as number
        }));
        
        // Sort based on selected field and direction
        return typesArray.sort((a, b) => {
            if (connectionSortField === "type") {
                return connectionSortDirection === "asc"
                    ? a.type.localeCompare(b.type)
                    : b.type.localeCompare(a.type);
            } else {
                return connectionSortDirection === "asc"
                    ? a.count - b.count
                    : b.count - a.count;
            }
        });
    };

    // Handle addon sort
    const handleAddonSort = (field: string) => {
        if (addonSortField === field) {
            // Toggle direction if clicking the same field
            setAddonSortDirection(addonSortDirection === "asc" ? "desc" : "asc");
        } else {
            // Set new field and default to ascending
            setAddonSortField(field);
            setAddonSortDirection("asc");
        }
    };
    
    // Helper to render addon sort indicators
    const renderAddonSortIndicator = (field: string) => {
        if (addonSortField !== field) return null;
        
        return addonSortDirection === "asc" 
            ? <span className="ml-1">↑</span> 
            : <span className="ml-1">↓</span>;
    };
    
    // Function to sort add-ons
    const getSortedAddons = (addons: any[]) => {
        if (!addons) return [];
        
        return [...addons].sort((a, b) => {
            let aValue: any;
            let bValue: any;
            
            switch (addonSortField) {
                case "name":
                    aValue = a.name?.toLowerCase() || "";
                    bValue = b.name?.toLowerCase() || "";
                    break;
                case "version":
                    aValue = a.version || "";
                    bValue = b.version || "";
                    break;
                case "cpu":
                    aValue = a.cpu_percent || 0;
                    bValue = b.cpu_percent || 0;
                    break;
                case "memory":
                    // Sort by memory usage or 0 if not available
                    aValue = a.memory_usage || 0;
                    bValue = b.memory_usage || 0;
                    break;
                default:
                    aValue = a.name?.toLowerCase() || "";
                    bValue = b.name?.toLowerCase() || "";
            }
            
            // For string comparisons
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return addonSortDirection === "asc" 
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }
            
            // For numeric comparisons
            return addonSortDirection === "asc" 
                ? aValue - bValue 
                : bValue - aValue;
        });
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center mb-6">
                    <Button variant="ghost" onClick={goBack} className="mr-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <Skeleton className="h-8 w-48" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Skeleton className="h-40" />
                    <Skeleton className="h-40" />
                </div>

                <Skeleton className="h-64 w-full mb-6" />
            </div>
        );
    }

    if (error || !snapshot) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center mb-6">
                    <Button variant="ghost" onClick={goBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </div>

                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {error || "Device details not found"}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center mb-6">
                <Button variant="ghost" onClick={goBack} className="mr-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <h1 className="text-3xl font-bold">
                    Ensi Home Box: {snapshot.deviceId || "Unknown"}
                </h1>
            </div>

            {/* House Information Card */}
            {houseData && (
                <Card className="bg-gradient-to-br from-[#F5F9FF] to-white dark:from-[#151A28] dark:to-[#1e1e1e] shadow-md mb-6">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-semibold text-[#1C4E80]">
                            House Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">House Name</p>
                                <p className="font-medium">{houseData.houseName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Created At</p>
                                <p className="font-medium">{formatDate(houseData.createdAt)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Admin ID</p>
                                <p className="font-medium truncate">{houseData.adminId}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Allowed Users</p>
                                <p className="font-medium">{houseData.allowedUsers.length} users</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Latest Snapshot Card */}
            <Card className="bg-gradient-to-br from-[#F1F1F1] to-white dark:from-[#202020] dark:to-[#1e1e1e] shadow-md mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <ServerIcon className="h-5 w-5 mr-2 text-[#1C4E80]" />
                            <div>
                                <CardTitle>System Information</CardTitle>
                                <CardDescription>
                                    {selectedLog && selectedLog !== snapshot ? (
                                        <>Historical data from: {formatDate(selectedLog.timestamp)}</>
                                    ) : (
                                        <>Last updated: {formatDate(snapshot?.timestamp)}</>
                                    )}
                                </CardDescription>
                            </div>
                        </div>
                        {selectedLog && selectedLog !== snapshot && (
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedLog(snapshot)}
                            >
                                Return to Latest
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                Home Assistant Version
                            </p>
                            <p className="font-medium">
                                {(selectedLog || snapshot)?.homeassistant_homeassistant_version ||
                                    "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                Boot Time
                            </p>
                            <p className="font-medium">
                                {formatDate((selectedLog || snapshot)?.system_boot_time)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                CPU Usage
                            </p>
                            <p className="font-medium">
                                {(selectedLog || snapshot)?.system_cpu_percent?.toFixed(1) || 0}%
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                Memory Usage
                            </p>
                            <p className="font-medium">
                                {(selectedLog || snapshot)?.system_memory_percent?.toFixed(1) || 0}%
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* System Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card className="bg-gradient-to-br from-[#F1F1F1] to-white dark:from-[#202020] dark:to-[#1e1e1e] shadow-md">
                    <CardHeader>
                        <div className="flex items-center">
                            <Server className="h-5 w-5 mr-2 text-[#1C4E80]" />
                            <CardTitle>System Info</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Home Assistant Version
                                </p>
                                <p className="font-medium">
                                    {(selectedLog || snapshot)?.homeassistant_homeassistant_version ||
                                        "N/A"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Boot Time
                                </p>
                                <p className="font-medium">
                                    {formatDate((selectedLog || snapshot)?.system_boot_time)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Last Update
                                </p>
                                <p className="font-medium">
                                    {formatDate((selectedLog || snapshot)?.timestamp)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Total Devices
                                </p>
                                <p className="font-medium">
                                    {(selectedLog || snapshot)?.devices_devices?.length || 0}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-[#F1F1F1] to-white dark:from-[#202020] dark:to-[#1e1e1e] shadow-md">
                    <CardHeader>
                        <div className="flex items-center">
                            <Cpu className="h-5 w-5 mr-2 text-[#1C4E80]" />
                            <CardTitle>Resource Usage</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium">
                                        CPU
                                    </span>
                                    <span className="text-sm font-medium">
                                        {(selectedLog || snapshot)?.system_cpu_percent?.toFixed(
                                            1,
                                        ) || 0}
                                        %
                                    </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2.5">
                                    <div
                                        className={`h-2.5 rounded-full ${
                                            ((selectedLog || snapshot)?.system_cpu_percent || 0) >
                                            80
                                                ? "bg-red-500"
                                                : ((selectedLog || snapshot)?.system_cpu_percent ||
                                                        0) > 50
                                                  ? "bg-orange-400"
                                                  : "bg-green-500"
                                        }`}
                                        style={{
                                            width: `${(selectedLog || snapshot)?.system_cpu_percent || 0}%`,
                                        }}
                                    ></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium">
                                        Memory
                                    </span>
                                    <span className="text-sm font-medium">
                                        {formatBytes(
                                            (selectedLog || snapshot)?.system_memory_used,
                                        )}{" "}
                                        /{" "}
                                        {formatBytes(
                                            (selectedLog || snapshot)?.system_memory_total,
                                        )}
                                        (
                                        {(selectedLog || snapshot)?.system_memory_percent?.toFixed(
                                            1,
                                        ) || 0}
                                        %)
                                    </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2.5">
                                    <div
                                        className={`h-2.5 rounded-full ${
                                            ((selectedLog || snapshot)?.system_memory_percent ||
                                                0) > 80
                                                ? "bg-red-500"
                                                : ((selectedLog || snapshot)?.system_memory_percent ||
                                                        0) > 50
                                                  ? "bg-orange-400"
                                                  : "bg-green-500"
                                        }`}
                                        style={{
                                            width: `${(selectedLog || snapshot)?.system_memory_percent || 0}%`,
                                        }}
                                    ></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium">
                                        Swap
                                    </span>
                                    <span className="text-sm font-medium">
                                        {formatBytes((selectedLog || snapshot)?.system_swap_used)}{" "}
                                        /{" "}
                                        {formatBytes(
                                            (selectedLog || snapshot)?.system_swap_total,
                                        )}
                                        (
                                        {(selectedLog || snapshot)?.system_swap_percent?.toFixed(
                                            1,
                                        ) || 0}
                                        %)
                                    </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2.5">
                                    <div
                                        className={`h-2.5 rounded-full ${
                                            ((selectedLog || snapshot)?.system_swap_percent ||
                                                0) > 80
                                                ? "bg-red-500"
                                                : ((selectedLog || snapshot)?.system_swap_percent ||
                                                        0) > 50
                                                  ? "bg-orange-400"
                                                  : "bg-green-500"
                                        }`}
                                        style={{
                                            width: `${(selectedLog || snapshot)?.system_swap_percent || 0}%`,
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Historical Logs Section with Analytics */}
            <Card className="bg-gradient-to-br from-[#F5F9FF] to-white dark:from-[#151A28] dark:to-[#1e1e1e] shadow-md mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Clock className="h-5 w-5 mr-2 text-[#1C4E80]" />
                            <div>
                                <CardTitle>Historical Data & Analytics</CardTitle>
                                <CardDescription>
                                    Chronological system information and metrics for this device
                                </CardDescription>
                            </div>
                        </div>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    View All Logs
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Historical Device Logs</DialogTitle>
                                    <DialogDescription>
                                        Browse and select a specific log to view detailed information
                                    </DialogDescription>
                                </DialogHeader>
                                
                                <div className="flex items-center space-x-2 my-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search logs by timestamp or value..."
                                            className="pl-8"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                        {searchQuery && (
                                            <Button
                                                variant="ghost"
                                                className="absolute right-0 top-0 h-9 w-9 p-0"
                                                onClick={() => setSearchQuery("")}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <Select
                                        value={sortField}
                                        onValueChange={setSortField}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="timestamp">Timestamp</SelectItem>
                                            <SelectItem value="cpu">CPU Usage</SelectItem>
                                            <SelectItem value="memory">Memory Usage</SelectItem>
                                            <SelectItem value="devices">Connected Devices</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                                    >
                                        {sortDirection === "asc" ? "↑" : "↓"}
                                    </Button>
                                </div>
                                
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-[#F1F1F1] dark:bg-[#202020]">
                                                <TableHead>Timestamp</TableHead>
                                                <TableHead>CPU Usage</TableHead>
                                                <TableHead>Memory Usage</TableHead>
                                                <TableHead>Connected Devices</TableHead>
                                                <TableHead>Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sortedLogs.map((log, index) => (
                                                <TableRow
                                                    key={index}
                                                    className={`hover:bg-[#A5D8DD]/10 dark:hover:bg-[#1C4E80]/10 ${
                                                        selectedLog && log.timestamp === selectedLog.timestamp
                                                            ? "bg-[#A5D8DD]/20 dark:bg-[#1C4E80]/20"
                                                            : ""
                                                    }`}
                                                >
                                                    <TableCell className="font-medium">
                                                        {formatDate(log.timestamp)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {log.system_cpu_percent?.toFixed(1) || 0}%
                                                    </TableCell>
                                                    <TableCell>
                                                        {log.system_memory_percent?.toFixed(1) || 0}%
                                                    </TableCell>
                                                    <TableCell>
                                                        {log.devices_devices?.length || 0}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => handleSelectLog(log)}
                                                        >
                                                            View
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                
                                <DialogFooter className="mt-4">
                                    <div className="text-sm text-muted-foreground">
                                        Showing {sortedLogs.length} of {historicalLogs.length} logs
                                    </div>
                                    <Button onClick={() => setDialogOpen(false)}>Close</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {historicalLogs.length > 0 ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <Card className="bg-white dark:bg-[#1e1e1e]">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm">CPU Usage Over Time</CardTitle>
                                            <LineChart className="h-4 w-4 text-[#1C4E80]" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="h-[200px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChartComponent
                                                    data={cpuChartData}
                                                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis 
                                                        dataKey="name" 
                                                        tick={{ fontSize: 10 }}
                                                        tickFormatter={(value) => {
                                                            // Show more concise labels on axis
                                                            return value.split(',')[0]; // Only show date part on axis
                                                        }}
                                                    />
                                                    <YAxis domain={[0, 100]} />
                                                    <Tooltip 
                                                        formatter={(value) => [`${value}%`, 'CPU Usage']}
                                                        labelFormatter={(label, items) => {
                                                            // Get the full datetime from the item
                                                            if (items && items.length > 0) {
                                                                const item = items[0].payload;
                                                                return new Date(item.dateTime).toLocaleString();
                                                            }
                                                            return label;
                                                        }}
                                                    />
                                                    <Line 
                                                        type="monotone" 
                                                        dataKey="value" 
                                                        stroke="#0091D5" 
                                                        strokeWidth={2}
                                                        dot={cpuChartData.length > 100 ? false : { r: 2 }}
                                                        activeDot={{ r: 5 }}
                                                    />
                                                </LineChartComponent>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>
                                
                                <Card className="bg-white dark:bg-[#1e1e1e]">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm">Memory Usage Over Time</CardTitle>
                                            <LineChart className="h-4 w-4 text-[#1C4E80]" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="h-[200px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChartComponent
                                                    data={memoryChartData}
                                                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis 
                                                        dataKey="name" 
                                                        tick={{ fontSize: 10 }}
                                                        tickFormatter={(value) => {
                                                            // Show more concise labels on axis
                                                            return value.split(',')[0]; // Only show date part on axis
                                                        }}
                                                    />
                                                    <YAxis domain={[0, 100]} />
                                                    <Tooltip 
                                                        formatter={(value) => [`${value}%`, 'Memory Usage']}
                                                        labelFormatter={(label, items) => {
                                                            // Get the full datetime from the item
                                                            if (items && items.length > 0) {
                                                                const item = items[0].payload;
                                                                return new Date(item.dateTime).toLocaleString();
                                                            }
                                                            return label;
                                                        }}
                                                    />
                                                    <Line 
                                                        type="monotone" 
                                                        dataKey="value" 
                                                        stroke="#7B3C9D" 
                                                        strokeWidth={2}
                                                        dot={memoryChartData.length > 100 ? false : { r: 2 }}
                                                        activeDot={{ r: 5 }}
                                                    />
                                                </LineChartComponent>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>
                                
                                <Card className="bg-white dark:bg-[#1e1e1e]">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm">Device Categories</CardTitle>
                                            <PieChart className="h-4 w-4 text-[#1C4E80]" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="h-[200px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChartComponent>
                                                    <Pie
                                                        data={deviceCategoriesData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        fill="#8884d8"
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                        labelLine={false}
                                                    >
                                                        {deviceCategoriesData.map((_, index) => (
                                                            <Cell 
                                                                key={`cell-${index}`} 
                                                                fill={[
                                                                    "#0091D5", 
                                                                    "#A5D8DD", 
                                                                    "#7B3C9D", 
                                                                    "#1C4E80"
                                                                ][index % 4]} 
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        formatter={(value, name, props) => [
                                                            `${value} devices`,
                                                            props.payload.name
                                                        ]}
                                                    />
                                                </PieChartComponent>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-medium mb-4">
                                    Historical Statistics
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <Card className="bg-white dark:bg-[#1e1e1e]">
                                        <CardContent className="p-4">
                                            <div className="text-sm text-muted-foreground">Avg CPU Usage</div>
                                            <div className="text-2xl font-bold text-[#1C4E80]">
                                                {(historicalLogs.reduce((sum, log) => sum + (log.system_cpu_percent || 0), 0) / 
                                                  (historicalLogs.length || 1)).toFixed(1)}%
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Based on {historicalLogs.length} data points
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-white dark:bg-[#1e1e1e]">
                                        <CardContent className="p-4">
                                            <div className="text-sm text-muted-foreground">Avg Memory Usage</div>
                                            <div className="text-2xl font-bold text-[#7B3C9D]">
                                                {(historicalLogs.reduce((sum, log) => sum + (log.system_memory_percent || 0), 0) / 
                                                  (historicalLogs.length || 1)).toFixed(1)}%
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Based on {historicalLogs.length} data points
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-white dark:bg-[#1e1e1e]">
                                        <CardContent className="p-4">
                                            <div className="text-sm text-muted-foreground">Max CPU Usage</div>
                                            <div className="text-2xl font-bold text-[#1C4E80]">
                                                {Math.max(...historicalLogs.map(log => log.system_cpu_percent || 0))}%
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-white dark:bg-[#1e1e1e]">
                                        <CardContent className="p-4">
                                            <div className="text-sm text-muted-foreground">Max Memory Usage</div>
                                            <div className="text-2xl font-bold text-[#7B3C9D]">
                                                {Math.max(...historicalLogs.map(log => log.system_memory_percent || 0))}%
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-medium mb-4">
                                    Recent Logs
                                </h3>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-[#F1F1F1] dark:bg-[#202020]">
                                                <TableHead>Timestamp</TableHead>
                                                <TableHead>CPU Usage</TableHead>
                                                <TableHead>Memory Usage</TableHead>
                                                <TableHead>Connected Devices</TableHead>
                                                <TableHead>Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {historicalLogs.slice(0, 5).map((log, index) => (
                                                <TableRow
                                                    key={index}
                                                    className={`hover:bg-[#A5D8DD]/10 dark:hover:bg-[#1C4E80]/10 ${
                                                        selectedLog && log.timestamp === selectedLog.timestamp
                                                            ? "bg-[#A5D8DD]/20 dark:bg-[#1C4E80]/20"
                                                            : ""
                                                    }`}
                                                >
                                                    <TableCell className="font-medium">
                                                        {formatDate(log.timestamp)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {log.system_cpu_percent?.toFixed(1) || 0}%
                                                    </TableCell>
                                                    <TableCell>
                                                        {log.system_memory_percent?.toFixed(1) || 0}%
                                                    </TableCell>
                                                    <TableCell>
                                                        {log.devices_devices?.length || 0}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => handleSelectLog(log)}
                                                        >
                                                            View
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-6 text-muted-foreground">
                            No historical data available for this device
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tabs for Devices and Addons */}
            <Tabs defaultValue="devices" className="mb-8">
                <TabsList className="mb-4">
                    <TabsTrigger value="devices">Connected Devices</TabsTrigger>
                    <TabsTrigger value="addons">Add-ons</TabsTrigger>
                    <TabsTrigger value="system">System Details</TabsTrigger>
                    <TabsTrigger value="device-metrics">
                        Device Metrics
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="devices">
                    <Card>
                        <CardHeader>
                            <CardTitle>Connected Devices</CardTitle>
                            <CardDescription>
                                Devices connected to this Ensi Home Box
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {devices.length > 0 ? (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-[#F1F1F1] dark:bg-[#202020]">
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-[#E5E5E5] dark:hover:bg-[#2A2A2A] transition-colors"
                                                    onClick={() => handleDeviceSort("name")}
                                                >
                                                    Name {renderSortIndicator("name")}
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-[#E5E5E5] dark:hover:bg-[#2A2A2A] transition-colors"
                                                    onClick={() => handleDeviceSort("manufacturer")}
                                                >
                                                    Manufacturer {renderSortIndicator("manufacturer")}
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-[#E5E5E5] dark:hover:bg-[#2A2A2A] transition-colors"
                                                    onClick={() => handleDeviceSort("model")}
                                                >
                                                    Model {renderSortIndicator("model")}
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-[#E5E5E5] dark:hover:bg-[#2A2A2A] transition-colors"
                                                    onClick={() => handleDeviceSort("entities")}
                                                >
                                                    Entities {renderSortIndicator("entities")}
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-[#E5E5E5] dark:hover:bg-[#2A2A2A] transition-colors"
                                                    onClick={() => handleDeviceSort("status")}
                                                >
                                                    Status {renderSortIndicator("status")}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sortedDevices.map((device) => (
                                                <TableRow
                                                    key={device.id}
                                                    className="hover:bg-[#A5D8DD]/10 dark:hover:bg-[#1C4E80]/10"
                                                >
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {getDeviceIcon(
                                                                device,
                                                            )}
                                                            {device.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {device.manufacturer ||
                                                            "N/A"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {device.model || "N/A"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {device.entity_count}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                device.disabled
                                                                    ? "destructive"
                                                                    : "default"
                                                            }
                                                            className={
                                                                device.disabled
                                                                    ? ""
                                                                    : "bg-[#A5D8DD] text-[#1C4E80] hover:bg-[#A5D8DD] dark:bg-[#0091D5] dark:text-white"
                                                            }
                                                        >
                                                            {device.disabled
                                                                ? "Disabled"
                                                                : "Enabled"}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center p-6 text-muted-foreground">
                                    No devices found for this Ensi Home Box
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="text-xs text-muted-foreground">
                            Total connected devices: {devices.length}
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="addons">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Add-ons</CardTitle>
                            <CardDescription>
                                Installed add-ons on this Ensi Home Box
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {snapshot.supervisor_addons &&
                            snapshot.supervisor_addons.length > 0 ? (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-[#F1F1F1] dark:bg-[#202020]">
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-[#E5E5E5] dark:hover:bg-[#2A2A2A] transition-colors"
                                                    onClick={() => handleAddonSort("name")}
                                                >
                                                    Name {renderAddonSortIndicator("name")}
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-[#E5E5E5] dark:hover:bg-[#2A2A2A] transition-colors"
                                                    onClick={() => handleAddonSort("version")}
                                                >
                                                    Version {renderAddonSortIndicator("version")}
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-[#E5E5E5] dark:hover:bg-[#2A2A2A] transition-colors"
                                                    onClick={() => handleAddonSort("cpu")}
                                                >
                                                    CPU {renderAddonSortIndicator("cpu")}
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-[#E5E5E5] dark:hover:bg-[#2A2A2A] transition-colors"
                                                    onClick={() => handleAddonSort("memory")}
                                                >
                                                    Memory {renderAddonSortIndicator("memory")}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {getSortedAddons(snapshot.supervisor_addons).map(
                                                (addon, index) => (
                                                    <TableRow
                                                        key={addon.slug}
                                                        className={
                                                            index % 2 === 0
                                                                ? "bg-background"
                                                                : "bg-muted/20"
                                                        }
                                                    >
                                                        <TableCell className="font-medium">
                                                            {addon.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            {addon.version}
                                                        </TableCell>
                                                        <TableCell>
                                                            {addon.cpu_percent
                                                                ? `${addon.cpu_percent}%`
                                                                : "N/A"}
                                                        </TableCell>
                                                        <TableCell>
                                                            {addon.memory_usage &&
                                                            addon.memory_limit
                                                                ? `${Math.round(addon.memory_usage / (1024 * 1024))}MB / ${Math.round(addon.memory_limit / (1024 * 1024))}MB`
                                                                : "N/A"}
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center p-6 text-muted-foreground">
                                    No add-ons data available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="system">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Details</CardTitle>
                            <CardDescription>
                                Detailed system information for this Ensi Home
                                Box
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-medium mb-3">
                                        System Information
                                    </h3>
                                    <dl className="space-y-2">
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">
                                                Home Assistant Version
                                            </dt>
                                            <dd className="font-medium">
                                                {snapshot.homeassistant_homeassistant_version ||
                                                    "N/A"}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">
                                                Boot Time
                                            </dt>
                                            <dd className="font-medium">
                                                {formatDate(
                                                    snapshot.system_boot_time,
                                                )}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">
                                                Last Update
                                            </dt>
                                            <dd className="font-medium">
                                                {formatDate(snapshot.timestamp)}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">
                                                Load Average
                                            </dt>
                                            <dd className="font-medium">
                                                {snapshot.system_load
                                                    ? snapshot.system_load.join(
                                                          " / ",
                                                      )
                                                    : "N/A"}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium mb-3">
                                        Memory Information
                                    </h3>
                                    <dl className="space-y-2">
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">
                                                Total Memory
                                            </dt>
                                            <dd className="font-medium">
                                                {formatBytes(
                                                    snapshot.system_memory_total,
                                                )}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">
                                                Used Memory
                                            </dt>
                                            <dd className="font-medium">
                                                {formatBytes(
                                                    snapshot.system_memory_used,
                                                )}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">
                                                Free Memory
                                            </dt>
                                            <dd className="font-medium">
                                                {formatBytes(
                                                    snapshot.system_memory_free,
                                                )}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">
                                                Available Memory
                                            </dt>
                                            <dd className="font-medium">
                                                {formatBytes(
                                                    snapshot.system_memory_available,
                                                )}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>

                            {snapshot.system_processes &&
                                snapshot.system_processes.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-lg font-medium mb-3">
                                            Running Processes
                                        </h3>
                                        <div className="bg-muted p-3 rounded-md overflow-auto max-h-40">
                                            <ul className="list-disc list-inside space-y-1">
                                                {snapshot.system_processes
                                                    .slice(0, 20)
                                                    .map((process, idx) => (
                                                        <li
                                                            key={idx}
                                                            className="text-sm"
                                                        >
                                                            {process}
                                                        </li>
                                                    ))}
                                                {snapshot.system_processes
                                                    .length > 20 && (
                                                    <li className="text-sm text-muted-foreground">
                                                        ...and{" "}
                                                        {snapshot
                                                            .system_processes
                                                            .length - 20}{" "}
                                                        more processes
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="device-metrics">
                    <Card>
                        <CardHeader>
                            <CardTitle>Device Metrics</CardTitle>
                            <CardDescription>
                                Average device metrics for this Ensi Home Box
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="bg-gradient-to-br from-[#F5F5F5] to-white dark:from-[#252525] dark:to-[#1e1e1e] shadow-sm">
                                    <CardHeader className="p-4 pb-2">
                                        <CardTitle className="text-sm">
                                            Device Status
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-2">
                                        <div className="flex items-center justify-around">
                                            <div className="text-center">
                                                <div className="text-sm text-muted-foreground">
                                                    Active
                                                </div>
                                                <div className="text-2xl font-bold text-green-500">
                                                    {
                                                        devices.filter(
                                                            (d) => !d.disabled,
                                                        ).length
                                                    }
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm text-muted-foreground">
                                                    Inactive
                                                </div>
                                                <div className="text-2xl font-bold text-red-500">
                                                    {
                                                        devices.filter(
                                                            (d) => d.disabled,
                                                        ).length
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-[#F5F5F5] to-white dark:from-[#252525] dark:to-[#1e1e1e] shadow-sm">
                                    <CardHeader className="p-4 pb-2">
                                        <CardTitle className="text-sm">
                                            Average Entities
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-2">
                                        {devices.length > 0 ? (
                                            <>
                                                <div className="text-2xl font-bold text-[#1C4E80]">
                                                    {(
                                                        devices.reduce(
                                                            (sum, device) =>
                                                                sum +
                                                                (device.entity_count ||
                                                                    0),
                                                            0,
                                                        ) / devices.length
                                                    ).toFixed(1)}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-2">
                                                    Entities per device
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-muted-foreground">
                                                No data
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-[#F5F5F5] to-white dark:from-[#252525] dark:to-[#1e1e1e] shadow-sm">
                                    <CardHeader className="p-4 pb-2">
                                        <CardTitle className="text-sm">
                                            Device Categories
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-2">
                                        {devices.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                {(() => {
                                                    // Count device types based on model/name patterns
                                                    const categories = {
                                                        Network: 0,
                                                        Media: 0,
                                                        Sensors: 0,
                                                        Other: 0,
                                                    };

                                                    devices.forEach(
                                                        (device) => {
                                                            const name = (
                                                                device.name ||
                                                                ""
                                                            ).toLowerCase();
                                                            const model = (
                                                                device.model ||
                                                                ""
                                                            ).toLowerCase();

                                                            if (
                                                                name.includes(
                                                                    "router",
                                                                ) ||
                                                                name.includes(
                                                                    "network",
                                                                ) ||
                                                                model.includes(
                                                                    "router",
                                                                ) ||
                                                                model.includes(
                                                                    "network",
                                                                )
                                                            ) {
                                                                categories[
                                                                    "Network"
                                                                ]++;
                                                            } else if (
                                                                name.includes(
                                                                    "tv",
                                                                ) ||
                                                                name.includes(
                                                                    "media",
                                                                ) ||
                                                                model.includes(
                                                                    "tv",
                                                                ) ||
                                                                model.includes(
                                                                    "media",
                                                                )
                                                            ) {
                                                                categories[
                                                                    "Media"
                                                                ]++;
                                                            } else if (
                                                                name.includes(
                                                                    "sensor",
                                                                ) ||
                                                                name.includes(
                                                                    "temperature",
                                                                ) ||
                                                                model.includes(
                                                                    "sensor",
                                                                )
                                                            ) {
                                                                categories[
                                                                    "Sensors"
                                                                ]++;
                                                            } else {
                                                                categories[
                                                                    "Other"
                                                                ]++;
                                                            }
                                                        },
                                                    );

                                                    return Object.entries(
                                                        categories,
                                                    ).map(
                                                        ([category, count]) => (
                                                            <div
                                                                key={category}
                                                                className="text-center"
                                                            >
                                                                <div className="text-xs text-muted-foreground">
                                                                    {category}
                                                                </div>
                                                                <div className="text-lg font-medium">
                                                                    {count}
                                                                </div>
                                                            </div>
                                                        ),
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="text-muted-foreground">
                                                No data
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="mt-6">
                                <h3 className="text-lg font-medium mb-3 flex items-center justify-between">
                                    <span>Device Connection Types</span>
                                    <div className="flex gap-4 text-sm">
                                        <button 
                                            className={`flex items-center ${connectionSortField === "type" ? "text-[#1C4E80] font-medium" : "text-muted-foreground"}`}
                                            onClick={() => handleConnectionSort("type")}
                                        >
                                            Sort by Type {renderConnectionSortIndicator("type")}
                                        </button>
                                        <button 
                                            className={`flex items-center ${connectionSortField === "count" ? "text-[#1C4E80] font-medium" : "text-muted-foreground"}`}
                                            onClick={() => handleConnectionSort("count")}
                                        >
                                            Sort by Count {renderConnectionSortIndicator("count")}
                                        </button>
                                    </div>
                                </h3>
                                <div className="rounded-md border p-4 bg-card">
                                    {devices.length > 0 ? (
                                        <div className="space-y-3">
                                            {getSortedConnectionTypes(devices).map(({ type, count }) => (
                                                <div
                                                    key={type}
                                                    className="flex items-center"
                                                >
                                                    <div className="w-24 text-sm">
                                                        {type}:
                                                    </div>
                                                    <div className="flex-1 ml-2">
                                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-[#0091D5] rounded-full"
                                                                style={{
                                                                    width: `${(count / devices.length) * 100}%`,
                                                                }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                    <div className="ml-2 text-sm">
                                                        {count}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center text-muted-foreground">
                                            No connection data available
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
