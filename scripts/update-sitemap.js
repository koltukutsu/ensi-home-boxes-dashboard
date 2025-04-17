#!/usr/bin/env node

/**
 * This script updates the lastModified dates in the sitemap.ts file
 * to reflect the current date. It can be run manually or as a cron job
 * whenever content is updated.
 * 
 * To run: node scripts/update-sitemap.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const sitemapPath = path.join(__dirname, '../src/app/sitemap.ts');

// Function to update the sitemap
function updateSitemap() {
  console.log('Updating sitemap lastModified dates...');
  
  try {
    // Read the sitemap file
    let sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    
    // Replace all lastModified dates with the current date
    const currentDate = new Date().toISOString();
    sitemapContent = sitemapContent.replace(
      /lastModified: new Date\([^)]*\)/g,
      `lastModified: new Date('${currentDate}')`
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(sitemapPath, sitemapContent, 'utf8');
    
    console.log('Sitemap updated successfully with date:', currentDate);
  } catch (error) {
    console.error('Error updating sitemap:', error);
    process.exit(1);
  }
}

// Run the update
updateSitemap(); 