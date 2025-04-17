/* ───────────
   BASE TYPES
   ─────────── */
export type Connection = [string, string];

export interface Entity {
    disabled: boolean;
    disabled_by: string | null;
    entity_category?: "diagnostic" | "config" | null;
    entity_id: string;
    name: string | null;
    platform: string;
}

export interface Device {
    connections: Connection[];
    disabled: boolean;
    entities: Entity[];
    entity_count: number;
    entry_type?: "service" | null;
    hw_version?: string | null;
    id: string; // GUID
    manufacturer?: string | null;
    model?: string | null;
    name: string;
    sw_version?: string | null;
    via_device_id?: string | null;
}

/* supervisor add‑ons */
export interface Addon {
    cpu_percent: number | null;
    memory_limit: number | null;
    memory_usage: number | null;
    name: string;
    slug: string;
    version: string;
}

/* IP / MAC addresses on an interface */
export interface SystemAddress {
    address: string;
    broadcast: string | null;
    family: 2 | 10 | 17; // AF_INET, AF_INET6 or AF_PACKET
    netmask: string | null;
    ptp: string | null;
}

/* Disk‑usage stats */
export interface DiskStats {
    free: number;
    percent: number;
    total: number;
    used: number;
}

/* Temperature sensor */
export interface Temperature {
    critical: number | null;
    current: number;
    high: number | null;
    label: string;
}

/* ────────────────
   ROOT DATA SHAPE
   ──────────────── */
export interface HomeAssistantSnapshot {
    /* devices */
    devices_devices: Device[];
    devices_total_devices: number;
    devices_total_entities: number;

    /* HA core version */
    homeassistant_homeassistant_version: string;

    /* integrations – flat dictionary: domain → version (or null) */
    [key: `homeassistant_integrations_${string}`]: string | null;

    /* add‑ons */
    supervisor_addons: Addon[];

    /* network interfaces – one key per interface, each an array of addresses */
    [key: `system_addresses_${string}`]: SystemAddress[];

    /* basic system info */
    system_boot_time: string; // ISO‑8601
    system_cpu_percent: number;

    /* disks – one key per mount‑point */
    [key: `system_disks_${string}`]: DiskStats;

    /* load averages */
    system_load: [number, number, number];

    /* memory */
    system_memory_available: number;
    system_memory_free: number;
    system_memory_percent: number;
    system_memory_total: number;
    system_memory_used: number;

    /* net‑io – iface & metric flattened, e.g.  system_net_io_wlan0_bytes_recv  */
    [key: `system_net_io_${string}`]: number;

    /* process list */
    system_processes: string[];

    /* swap */
    system_swap_free: number;
    system_swap_percent: number;
    system_swap_sin: number;
    system_swap_sout: number;
    system_swap_total: number;
    system_swap_used: number;

    /* temperatures – one key per sensor name */
    [key: `system_temperatures_${string}`]: Temperature[];

    /* timestamp of snapshot */
    timestamp: string;

    /* source device ID - used for tracking which device this snapshot came from */
    deviceId?: string;
}
