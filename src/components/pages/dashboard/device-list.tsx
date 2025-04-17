"use client";

import { useState } from "react";
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
    Laptop,
    Smartphone,
    Router,
    Tv,
    HardDrive,
} from "lucide-react";
import type { Device } from "@/types/connectivity";

interface DeviceListProps {
    devices: Device[];
}

export function DeviceList({ devices }: DeviceListProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    const filteredDevices = devices.filter(
        (device) =>
            device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            device.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (device.manufacturer &&
                device.manufacturer
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())) ||
            (device.model &&
                device.model.toLowerCase().includes(searchQuery.toLowerCase())),
    );

    const handleViewDevice = (deviceId: string) => {
        router.push(`/dashboard/device/${deviceId}`);
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

    return (
        <Card className="shadow-md border-[#A5D8DD] dark:border-[#1C4E80]">
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Connected Devices</CardTitle>
                        <CardDescription>
                            Manage and monitor all your connected devices
                        </CardDescription>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search devices..."
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
                                <TableHead>Name</TableHead>
                                <TableHead>Manufacturer</TableHead>
                                <TableHead>Model</TableHead>
                                <TableHead>Entities</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDevices.length > 0 ? (
                                filteredDevices.map((device) => (
                                    <TableRow
                                        key={device.id}
                                        className="hover:bg-[#A5D8DD]/10 dark:hover:bg-[#1C4E80]/10"
                                    >
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {getDeviceIcon(device)}
                                                {device.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {device.manufacturer || "N/A"}
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
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleViewDevice(device.id)
                                                }
                                                className="text-[#1C4E80] hover:text-[#0091D5] hover:bg-[#A5D8DD]/20 dark:text-[#0091D5] dark:hover:bg-[#1C4E80]/20"
                                            >
                                                View{" "}
                                                <ChevronRight className="ml-1 h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-24 text-center"
                                    >
                                        {searchQuery
                                            ? "No devices match your search"
                                            : "No devices available"}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
                Total devices: {filteredDevices.length}
            </CardFooter>
        </Card>
    );
}
