import { toast } from "sonner";
import type { HomeAssistantSnapshot } from "@/types/connectivity";

/**
 * Service for handling notifications related to connectivity changes
 */
export const NotificationService = {
    /**
     * Compare current and previous logs to detect important changes
     * @param currentLog Current log snapshot
     * @param previousLog Previous log snapshot
     */
    notifyChanges(
        currentLog: HomeAssistantSnapshot,
        previousLog: HomeAssistantSnapshot | null,
    ) {
        if (!previousLog) {
            this.notifyNewData(currentLog);
            return;
        }

        // Check for device count changes
        const currentDeviceCount = currentLog.devices_total_devices || 0;
        const previousDeviceCount = previousLog.devices_total_devices || 0;

        if (currentDeviceCount > previousDeviceCount) {
            const newDevices = currentDeviceCount - previousDeviceCount;
            toast.info(`${newDevices} new device(s) detected`, {
                description: `Total devices: ${currentDeviceCount}`,
                duration: 5000,
            });
        } else if (currentDeviceCount < previousDeviceCount) {
            const removedDevices = previousDeviceCount - currentDeviceCount;
            toast.warning(`${removedDevices} device(s) disconnected`, {
                description: `Total devices: ${currentDeviceCount}`,
                duration: 5000,
            });
        }

        // Check for high CPU usage
        if (
            currentLog.system_cpu_percent > 80 &&
            (previousLog.system_cpu_percent < 80 ||
                !previousLog.system_cpu_percent)
        ) {
            toast.error("High CPU usage detected", {
                description: `Current CPU usage: ${currentLog.system_cpu_percent}%`,
                duration: 8000,
            });
        }

        // Check for high memory usage
        if (
            currentLog.system_memory_percent > 85 &&
            (previousLog.system_memory_percent < 85 ||
                !previousLog.system_memory_percent)
        ) {
            toast.error("High memory usage detected", {
                description: `Current memory usage: ${currentLog.system_memory_percent}%`,
                duration: 8000,
            });
        }

        // Check for disabled devices
        if (currentLog.devices_devices && previousLog.devices_devices) {
            const newlyDisabledDevices = currentLog.devices_devices.filter(
                (device) =>
                    device.disabled &&
                    !previousLog.devices_devices.find((d) => d.id === device.id)
                        ?.disabled,
            );

            if (newlyDisabledDevices.length > 0) {
                toast.warning(
                    `${newlyDisabledDevices.length} device(s) disabled`,
                    {
                        description: newlyDisabledDevices
                            .map((d) => d.name)
                            .join(", "),
                        duration: 5000,
                    },
                );
            }
        }
    },

    /**
     * Notify about new data coming in for the first time
     * @param log Current log snapshot
     */
    notifyNewData(log: HomeAssistantSnapshot) {
        toast.success("WatchDash Connected", {
            description: `Version: ${log.homeassistant_homeassistant_version || "Unknown"}`,
            duration: 3000,
        });

        // Notify about device count
        if (log.devices_total_devices) {
            toast.info(`${log.devices_total_devices} devices detected`, {
                description: `With ${log.devices_total_entities || 0} total entities`,
                duration: 3000,
            });
        }

        // Check for high resource usage on first load
        if (log.system_cpu_percent > 80) {
            toast.warning("High CPU usage detected", {
                description: `Current CPU usage: ${log.system_cpu_percent}%`,
                duration: 5000,
            });
        }

        if (log.system_memory_percent > 85) {
            toast.warning("High memory usage detected", {
                description: `Current memory usage: ${log.system_memory_percent}%`,
                duration: 5000,
            });
        }
    },
};
