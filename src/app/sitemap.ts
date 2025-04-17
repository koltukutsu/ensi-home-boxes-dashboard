import { MetadataRoute } from "next";

/**
 * Generate a sitemap for WatchDash
 * This enables better SEO by providing search engines with a map of all pages
 */
export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://watchdash.solace.com";

    // Get current date for lastModified
    const currentDate = new Date().toISOString();

    return [
        // Main Pages
        {
            url: `${baseUrl}`,
            lastModified: currentDate,
            changeFrequency: "monthly",
            priority: 1.0,
        },
        {
            url: `${baseUrl}/dashboard`,
            lastModified: currentDate,
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: currentDate,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/diagnostic`,
            lastModified: currentDate,
            changeFrequency: "weekly",
            priority: 0.8,
        },

        // Documentation & Help
        {
            url: `${baseUrl}/help`,
            lastModified: currentDate,
            changeFrequency: "monthly",
            priority: 0.7,
        },

        // Legal Pages
        {
            url: `${baseUrl}/terms`,
            lastModified: currentDate,
            changeFrequency: "yearly",
            priority: 0.5,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: currentDate,
            changeFrequency: "yearly",
            priority: 0.5,
        },
    ];
}
