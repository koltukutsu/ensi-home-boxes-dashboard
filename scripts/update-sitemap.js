/**
 * update-sitemap.js
 *
 * This script checks if the sitemap.ts file exists and logs confirmation.
 * Used as a prebuild step for ensuring the sitemap is available.
 */

const fs = require("fs");
const path = require("path");

// Simple color functions for terminal output (avoiding chalk ESM issues)
const colors = {
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
};

// Define the path to sitemap.ts
const sitemapPath = path.join(process.cwd(), "src", "app", "sitemap.ts");

// Check if the sitemap.ts file exists
try {
    if (fs.existsSync(sitemapPath)) {
        console.log(
            colors.green("✓ sitemap.ts is available - ready for build"),
        );
    } else {
        console.warn(
            colors.yellow(
                "⚠ sitemap.ts not found. The build process will continue, but the site may not have a sitemap.",
            ),
        );
    }
} catch (err) {
    console.error(colors.red("Error checking sitemap.ts:"), err);
}

// Exit successfully to allow build to continue
process.exit(0);
