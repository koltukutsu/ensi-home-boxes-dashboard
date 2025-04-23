"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from "@/registry/new-york-v4/ui/card";
import { Badge } from "@/registry/new-york-v4/ui/badge";
import { Button } from "@/registry/new-york-v4/ui/button";
import { Input } from "@/registry/new-york-v4/ui/input";
import {
    Search,
    ChevronRight,
    Server,
    Cpu,
    HardDrive,
    MemoryStick,
    Home,
} from "lucide-react";
import type { HomeAssistantSnapshot } from "@/types/connectivity";
import { ConnectivityService } from "@/lib/connectivity-service";
import { getHouseData, HouseData } from "@/lib/firebase-utils";

interface SnapshotListProps {
    snapshots: HomeAssistantSnapshot[];
}

export function SnapshotList({ snapshots }: SnapshotListProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [houseData, setHouseData] = useState<{[deviceId: string]: HouseData | null}>({});

    useEffect(() => {
        // Fetch house data for all snapshots
        const fetchHouseDataForDevices = async () => {
            const data: {[deviceId: string]: HouseData | null} = {};
            
            for (const snapshot of snapshots) {
                if (snapshot.deviceId) {
                    try {
                        const house = await getHouseData(snapshot.deviceId);
                        data[snapshot.deviceId] = house;
                    } catch (error) {
                        console.error(`Error fetching house data for ${snapshot.deviceId}:`, error);
                        data[snapshot.deviceId] = null;
                    }
                }
            }
            
            setHouseData(data);
        };
        
        fetchHouseDataForDevices();
    }, [snapshots]);

    const filteredSnapshots = snapshots.filter((snapshot) => {
        // Get device ID or use timestamp as fallback
        const deviceId = snapshot.deviceId || "unknown";
        
        // Get house name if available
        const houseName = houseData[deviceId]?.houseName || "";

        // Build searchable text from multiple fields
        const searchableText = [
            deviceId,
            houseName,
            snapshot.homeassistant_homeassistant_version,
            snapshot.timestamp,
        ]
            .join(" ")
            .toLowerCase();

        return searchableText.includes(searchQuery.toLowerCase());
    });

    const handleViewSnapshot = (snapshotId: string) => {
        router.push(`/dashboard/device/${snapshotId}`);
    };

    const getDeviceIcon = (snapshot: HomeAssistantSnapshot) => {
        // Base the icon on snapshot data like CPU usage
        if (snapshot.system_cpu_percent > 80) {
            return <Cpu className="h-4 w-4 text-[#FF5252]" />;
        } else if (snapshot.system_memory_percent > 80) {
            return <MemoryStick className="h-4 w-4 text-[#FF9800]" />;
        } else {
            return <Server className="h-4 w-4 text-[#1C4E80]" />;
        }
    };

    const formatMemory = (used: number, total: number) => {
        const usedGB = (used / (1024 * 1024 * 1024)).toFixed(1);
        const totalGB = (total / (1024 * 1024 * 1024)).toFixed(1);
        return `${usedGB}GB / ${totalGB}GB`;
    };

    return (
        <Card className="shadow-md border-[#A5D8DD] dark:border-[#1C4E80]">
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Ensi Home Boxes</CardTitle>
                        <CardDescription>
                            View and monitor all your connected Ensi Home Boxes
                        </CardDescription>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search boxes..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-[#F1F1F1] dark:bg-[#202020]">
                                <TableHead>Identifier</TableHead>
                                <TableHead>House Name</TableHead>
                                <TableHead>Version</TableHead>
                                <TableHead>CPU</TableHead>
                                <TableHead>Memory</TableHead>
                                <TableHead>Devices</TableHead>
                                <TableHead>Last Update</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSnapshots.length > 0 ? (
                                filteredSnapshots.map((snapshot) => (
                                    <TableRow
                                        key={
                                            snapshot.deviceId ||
                                            snapshot.timestamp
                                        }
                                        className="hover:bg-[#A5D8DD]/10 dark:hover:bg-[#1C4E80]/10"
                                    >
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {getDeviceIcon(snapshot)}
                                                {snapshot.deviceId ||
                                                    "Unknown Device"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {snapshot.deviceId && houseData[snapshot.deviceId] ? (
                                                <div className="flex items-center gap-2">
                                                    <Home className="h-4 w-4 text-[#1C4E80]" />
                                                    {houseData[snapshot.deviceId]?.houseName || "N/A"}
                                                </div>
                                            ) : (
                                                "N/A"
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {snapshot.homeassistant_homeassistant_version ||
                                                "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    snapshot.system_cpu_percent >
                                                    80
                                                        ? "destructive"
                                                        : snapshot.system_cpu_percent >
                                                            50
                                                          ? "outline"
                                                          : "default"
                                                }
                                                className={
                                                    snapshot.system_cpu_percent >
                                                    80
                                                        ? ""
                                                        : "bg-[#A5D8DD] text-[#1C4E80] hover:bg-[#A5D8DD] dark:bg-[#0091D5] dark:text-white"
                                                }
                                            >
                                                {snapshot.system_cpu_percent?.toFixed(
                                                    1,
                                                ) || "0"}
                                                %
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {snapshot.system_memory_total &&
                                            snapshot.system_memory_used ? (
                                                <div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {formatMemory(
                                                            snapshot.system_memory_used,
                                                            snapshot.system_memory_total,
                                                        )}
                                                    </div>
                                                    <div className="w-full bg-muted rounded-full h-2 mt-1">
                                                        <div
                                                            className={`h-2 rounded-full ${
                                                                snapshot.system_memory_percent >
                                                                80
                                                                    ? "bg-red-500"
                                                                    : snapshot.system_memory_percent >
                                                                        50
                                                                      ? "bg-orange-400"
                                                                      : "bg-green-500"
                                                            }`}
                                                            style={{
                                                                width: `${snapshot.system_memory_percent}%`,
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ) : (
                                                "N/A"
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {snapshot.devices_devices?.length ||
                                                0}
                                            {snapshot.devices_devices &&
                                                snapshot.devices_devices
                                                    .length > 0 && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {
                                                            snapshot.devices_devices.filter(
                                                                (d) =>
                                                                    !d.disabled,
                                                            ).length
                                                        }{" "}
                                                        active
                                                    </div>
                                                )}
                                        </TableCell>
                                        <TableCell>
                                            {ConnectivityService.formatTimestamp(
                                                snapshot.timestamp,
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleViewSnapshot(
                                                        snapshot.deviceId || "",
                                                    )
                                                }
                                                className="text-[#1C4E80] hover:text-[#0091D5] hover:bg-[#A5D8DD]/20 dark:text-[#0091D5] dark:hover:bg-[#1C4E80]/20"
                                            >
                                                Details{" "}
                                                <ChevronRight className="ml-1 h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="h-24 text-center"
                                    >
                                        {searchQuery
                                            ? "No home boxes match your search"
                                            : "No home boxes available"}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
                Total Ensi Home Boxes: {filteredSnapshots.length}
            </CardFooter>
        </Card>
    );
}
