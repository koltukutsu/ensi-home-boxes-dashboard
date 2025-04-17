import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    doc,
    Timestamp,
    DocumentData,
    onSnapshot,
    Unsubscribe,
    collectionGroup,
} from "firebase/firestore";
import type { HomeAssistantSnapshot, Device } from "@/types/connectivity";

// Define fallback data for when connectivity fails
const FALLBACK_SNAPSHOT: HomeAssistantSnapshot = {
    timestamp: new Date().toISOString(),
    devices_devices: [
        {
            connections: [["ip", "192.168.1.100"]],
            disabled: false,
            entities: [
                {
                    disabled: false,
                    disabled_by: null,
                    entity_id: "sensor.mock_temperature",
                    name: "Mock Temperature",
                    platform: "mock",
                },
            ],
            entity_count: 1,
            id: "mock-device-1",
            manufacturer: "Mock Manufacturer",
            model: "Mock Device Model",
            name: "Mock Device 1",
            sw_version: "1.0",
        },
    ],
    devices_total_devices: 1,
    devices_total_entities: 1,
    homeassistant_homeassistant_version: "2023.6.0",
    system_boot_time: new Date().toISOString(),
    system_cpu_percent: 25,
    system_memory_percent: 40,
    system_memory_total: 8000000000,
    system_memory_used: 3200000000,
    system_memory_free: 4800000000,
    system_memory_available: 4800000000,
    system_load: [1.5, 1.2, 1.0],
    supervisor_addons: [
        {
            cpu_percent: 5,
            memory_limit: 200000000,
            memory_usage: 100000000,
            name: "Mock Addon",
            slug: "mock-addon",
            version: "1.0",
        },
    ],
    system_processes: ["mock-process-1", "mock-process-2"],
    system_swap_free: 2000000000,
    system_swap_percent: 10,
    system_swap_sin: 100000,
    system_swap_sout: 50000,
    system_swap_total: 2000000000,
    system_swap_used: 200000000,
};

/**
 * Service for handling connectivity log operations
 */
export const ConnectivityService = {
    /**
     * Fetches all connectivity logs for all devices
     */
    async getAllLogs(): Promise<HomeAssistantSnapshot[]> {
        try {
            console.log("Fetching all connectivity logs");

            // Get all devices from connectivity_logs collection
            const devicesRef = collection(db, "connectivity_logs");
            const devicesSnapshot = await getDocs(devicesRef);

            console.log(`Found ${devicesSnapshot.size} connectivity logs`);

            if (devicesSnapshot.empty) {
                console.log("No devices found in connectivity_logs");
                return [FALLBACK_SNAPSHOT];
            }

            const logsData: HomeAssistantSnapshot[] = [];
            const deviceProcessingPromises = [];

            // Process each device document
            for (const deviceDoc of devicesSnapshot.docs) {
                const deviceId = deviceDoc.id;
                console.log(`Processing connectivity doc: ${deviceId}`);

                // Create a promise for processing this device's logs
                const devicePromise = (async () => {
                    try {
                        // Get logs subcollection for this device
                        const logsCollectionRef = collection(
                            deviceDoc.ref,
                            "logs",
                        );
                        const logsQuery = query(
                            logsCollectionRef,
                            orderBy("timestamp", "desc"),
                            limit(1),
                        );
                        const logsSnapshot = await getDocs(logsQuery);

                        if (!logsSnapshot.empty) {
                            const latestLogDoc = logsSnapshot.docs[0];
                            const logData =
                                latestLogDoc.data() as HomeAssistantSnapshot;

                            if (logData.devices_devices || logData.timestamp) {
                                logsData.push({
                                    ...logData,
                                    timestamp:
                                        logData.timestamp ||
                                        new Date().toISOString(),
                                    deviceId: deviceId, // Add deviceId to track which device this belongs to
                                });
                            }
                        }
                    } catch (error) {
                        console.warn(
                            `Error processing logs for device ${deviceId}:`,
                            error,
                        );
                    }
                })();

                deviceProcessingPromises.push(devicePromise);
            }

            // Wait for all device processing to complete
            await Promise.allSettled(deviceProcessingPromises);

            if (logsData.length === 0) {
                console.warn("No valid logs found for any device");
                return [FALLBACK_SNAPSHOT];
            }

            // Sort by timestamp, newest first
            logsData.sort(
                (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime(),
            );

            return logsData;
        } catch (error) {
            console.error("Error fetching logs:", error);
            return [FALLBACK_SNAPSHOT];
        }
    },

    /**
     * Fetches the most recent connectivity log
     */
    async getLatestLog(): Promise<HomeAssistantSnapshot | null> {
        try {
            console.log("Fetching latest connectivity log");

            // Get all devices
            const devicesRef = collection(db, "connectivity_logs");
            const devicesSnapshot = await getDocs(devicesRef);

            if (devicesSnapshot.empty) {
                console.log("No devices found");
                return FALLBACK_SNAPSHOT;
            }

            // Track the latest log across all devices
            let latestLog: HomeAssistantSnapshot | null = null;
            let latestTimestamp = 0;

            // Process each device to find its latest log
            const devicePromises = devicesSnapshot.docs.map(
                async (deviceDoc) => {
                    try {
                        const logsCollectionRef = collection(
                            deviceDoc.ref,
                            "logs",
                        );
                        const logsQuery = query(
                            logsCollectionRef,
                            orderBy("timestamp", "desc"),
                            limit(1),
                        );
                        const logsSnapshot = await getDocs(logsQuery);

                        if (!logsSnapshot.empty) {
                            const logDoc = logsSnapshot.docs[0];
                            const logData =
                                logDoc.data() as HomeAssistantSnapshot;

                            if (logData.timestamp) {
                                const timestamp = new Date(
                                    logData.timestamp,
                                ).getTime();
                                if (timestamp > latestTimestamp) {
                                    latestTimestamp = timestamp;
                                    latestLog = {
                                        ...logData,
                                        timestamp: logData.timestamp,
                                        deviceId: deviceDoc.id,
                                    };
                                }
                            }
                        }
                    } catch (error) {
                        console.warn(
                            `Error getting latest log for device ${deviceDoc.id}:`,
                            error,
                        );
                    }
                },
            );

            // Wait for all device processing to complete
            await Promise.allSettled(devicePromises);

            if (latestLog) {
                return latestLog;
            }

            console.log("No valid logs found, returning fallback");
            return FALLBACK_SNAPSHOT;
        } catch (error) {
            console.error("Error fetching latest log:", error);
            return FALLBACK_SNAPSHOT;
        }
    },

    /**
     * Subscribe to real-time updates of connectivity logs
     * @param callback Function to call when data updates
     * @returns Unsubscribe function
     */
    subscribeToLogs(
        callback: (logs: HomeAssistantSnapshot[]) => void,
    ): Unsubscribe {
        console.log("Setting up subscription to connectivity logs");

        let unsubscribeFunctions: Unsubscribe[] = [];
        let allLogs: Record<string, HomeAssistantSnapshot> = {}; // Use deviceId as key
        let hasCalledBack = false;
        let timeoutId: NodeJS.Timeout;

        // Set a timeout to ensure we show fallback data if Firebase is slow
        timeoutId = setTimeout(() => {
            console.log("Subscription timeout - showing fallback data");
            if (Object.keys(allLogs).length === 0) {
                callback([FALLBACK_SNAPSHOT]);
            }
        }, 5000);

        // Subscribe to the main connectivity_logs collection to detect new devices
        const mainCollectionRef = collection(db, "connectivity_logs");
        const mainUnsubscribe = onSnapshot(
            mainCollectionRef,
            (devicesSnapshot) => {
                console.log(`Got ${devicesSnapshot.size} devices in real-time`);

                // Clear existing device subscriptions and set up new ones
                unsubscribeFunctions.forEach((unsub, index) => {
                    if (index > 0) unsub(); // Keep the main subscription
                });
                unsubscribeFunctions = [mainUnsubscribe];

                if (devicesSnapshot.empty) {
                    console.log("No devices found in real-time subscription");
                    if (!hasCalledBack) {
                        callback([FALLBACK_SNAPSHOT]);
                        hasCalledBack = true;
                    }
                    return;
                }

                // Set up a subscription for each device's logs
                devicesSnapshot.forEach((deviceDoc) => {
                    const deviceId = deviceDoc.id;
                    const logsCollectionRef = collection(deviceDoc.ref, "logs");
                    const logsQuery = query(
                        logsCollectionRef,
                        orderBy("timestamp", "desc"),
                        limit(1),
                    );

                    const deviceUnsubscribe = onSnapshot(
                        logsQuery,
                        (logsSnapshot) => {
                            if (!logsSnapshot.empty) {
                                const logDoc = logsSnapshot.docs[0];
                                const logData =
                                    logDoc.data() as HomeAssistantSnapshot;

                                if (
                                    logData.timestamp ||
                                    logData.devices_devices
                                ) {
                                    // Store this device's latest log
                                    allLogs[deviceId] = {
                                        ...logData,
                                        timestamp:
                                            logData.timestamp ||
                                            new Date().toISOString(),
                                        deviceId,
                                    };

                                    // Convert to array and sort by timestamp
                                    const logsArray = Object.values(
                                        allLogs,
                                    ).sort(
                                        (a, b) =>
                                            new Date(b.timestamp).getTime() -
                                            new Date(a.timestamp).getTime(),
                                    );

                                    // Clear timeout and send data
                                    clearTimeout(timeoutId);
                                    callback(logsArray);
                                    hasCalledBack = true;
                                }
                            }
                        },
                        (error) => {
                            console.error(
                                `Error in logs subscription for device ${deviceId}:`,
                                error,
                            );
                        },
                    );

                    unsubscribeFunctions.push(deviceUnsubscribe);
                });
            },
            (error) => {
                console.error("Error in devices subscription:", error);
                if (!hasCalledBack) {
                    callback([FALLBACK_SNAPSHOT]);
                    hasCalledBack = true;
                }
            },
        );

        unsubscribeFunctions.push(mainUnsubscribe);

        // Return a function that unsubscribes from everything
        return () => {
            console.log("Unsubscribing from all connectivity subscriptions");
            clearTimeout(timeoutId);
            unsubscribeFunctions.forEach((unsub) => unsub());
        };
    },

    /**
     * Subscribe to real-time updates of the latest log
     * @param callback Function to call when data updates
     * @returns Unsubscribe function
     */
    subscribeToLatestLog(
        callback: (log: HomeAssistantSnapshot | null) => void,
    ): Unsubscribe {
        console.log("Setting up subscription to latest log");

        let unsubscribeFunctions: Unsubscribe[] = [];
        let latestLog: HomeAssistantSnapshot | null = null;
        let latestTimestamp = 0;
        let hasCalledBack = false;
        let timeoutId: NodeJS.Timeout;

        // Set a timeout to ensure we show fallback data if Firebase is slow
        timeoutId = setTimeout(() => {
            console.log(
                "Latest log subscription timeout - showing fallback data",
            );
            if (!hasCalledBack) {
                callback(FALLBACK_SNAPSHOT);
                hasCalledBack = true;
            }
        }, 5000);

        // Subscribe to the main collection for devices
        const devicesRef = collection(db, "connectivity_logs");
        const mainUnsubscribe = onSnapshot(
            devicesRef,
            (devicesSnapshot) => {
                console.log(
                    `Got ${devicesSnapshot.size} devices in latest log subscription`,
                );

                // Clear existing device subscriptions
                unsubscribeFunctions.forEach((unsub, index) => {
                    if (index > 0) unsub(); // Keep the main subscription
                });
                unsubscribeFunctions = [mainUnsubscribe];

                if (devicesSnapshot.empty) {
                    console.log("No devices found in latest log subscription");
                    if (!hasCalledBack) {
                        callback(FALLBACK_SNAPSHOT);
                        hasCalledBack = true;
                    }
                    return;
                }

                // Set up subscriptions for each device's latest log
                devicesSnapshot.forEach((deviceDoc) => {
                    const deviceId = deviceDoc.id;
                    const logsCollectionRef = collection(deviceDoc.ref, "logs");
                    const logsQuery = query(
                        logsCollectionRef,
                        orderBy("timestamp", "desc"),
                        limit(1),
                    );

                    const deviceUnsubscribe = onSnapshot(
                        logsQuery,
                        (logsSnapshot) => {
                            if (!logsSnapshot.empty) {
                                const logDoc = logsSnapshot.docs[0];
                                const logData =
                                    logDoc.data() as HomeAssistantSnapshot;

                                if (logData.timestamp) {
                                    const timestamp = new Date(
                                        logData.timestamp,
                                    ).getTime();

                                    if (timestamp > latestTimestamp) {
                                        latestTimestamp = timestamp;
                                        latestLog = {
                                            ...logData,
                                            timestamp: logData.timestamp,
                                            deviceId,
                                        };

                                        // Clear timeout and send data
                                        clearTimeout(timeoutId);
                                        callback(latestLog);
                                        hasCalledBack = true;
                                    }
                                }
                            }
                        },
                        (error) => {
                            console.error(
                                `Error in latest log subscription for device ${deviceId}:`,
                                error,
                            );
                        },
                    );

                    unsubscribeFunctions.push(deviceUnsubscribe);
                });
            },
            (error) => {
                console.error(
                    "Error in devices subscription for latest log:",
                    error,
                );
                if (!hasCalledBack) {
                    callback(FALLBACK_SNAPSHOT);
                    hasCalledBack = true;
                }
            },
        );

        unsubscribeFunctions.push(mainUnsubscribe);

        // Return a function that unsubscribes from everything
        return () => {
            console.log("Unsubscribing from latest log subscriptions");
            clearTimeout(timeoutId);
            unsubscribeFunctions.forEach((unsub) => unsub());
        };
    },

    /**
     * Fetches detailed information about a specific device
     */
    async getDeviceDetails(deviceId: string): Promise<Device | null> {
        try {
            // First check if this device has a document in connectivity_logs
            const deviceDocRef = doc(db, "connectivity_logs", deviceId);
            const deviceDoc = await getDoc(deviceDocRef);

            if (deviceDoc.exists()) {
                // Get the latest log for this device
                const logsCollectionRef = collection(deviceDocRef, "logs");
                const logsQuery = query(
                    logsCollectionRef,
                    orderBy("timestamp", "desc"),
                    limit(1),
                );
                const logsSnapshot = await getDocs(logsQuery);

                if (!logsSnapshot.empty) {
                    const logData =
                        logsSnapshot.docs[0].data() as HomeAssistantSnapshot;

                    if (logData.devices_devices) {
                        // Find this device in the devices array
                        const device = logData.devices_devices.find(
                            (d) => d.id === deviceId,
                        );
                        if (device) {
                            return device;
                        }
                    }
                }
            }

            // If we can't find the device directly, try looking through all logs
            const latestLog = await this.getLatestLog();

            if (!latestLog || !latestLog.devices_devices) {
                return null;
            }

            // Find the device in the latest log
            return (
                latestLog.devices_devices.find((d) => d.id === deviceId) || null
            );
        } catch (error) {
            console.error("Error fetching device details:", error);
            return null;
        }
    },

    /**
     * Formats timestamp for display
     */
    formatTimestamp(timestamp: string | Timestamp | DocumentData): string {
        let date: Date;

        if (timestamp instanceof Timestamp) {
            date = timestamp.toDate();
        } else if (typeof timestamp === "string") {
            date = new Date(timestamp);
        } else if (timestamp && typeof timestamp === "object") {
            // Handle DocumentData case
            const timestampData = timestamp as any;
            if (timestampData.seconds) {
                date = new Date(timestampData.seconds * 1000);
            } else {
                date = new Date();
            }
        } else {
            date = new Date();
        }

        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    },
};
