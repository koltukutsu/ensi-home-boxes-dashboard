import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ochtarcus.com";

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/api/", // Prevent crawling of API routes
                "/_next/", // Prevent crawling of Next.js system files
                "/admin/", // Prevent crawling of admin pages
            ],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
