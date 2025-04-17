/**
 * Generates prefetch data for the library components to improve performance
 * This script analyzes the content and creates optimized data for prefetching
 */

const fs = require('fs');
const path = require('path');

// Get content data sources
const videoDataPath = path.join(__dirname, '../src/data/video-data.js');
const blogDataPath = path.join(__dirname, '../src/data/blog-data.js');

// Output paths
const outputDir = path.join(__dirname, '../public/data');
const prefetchDataPath = path.join(outputDir, 'prefetch-lib.json');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to extract content data
async function extractContentData() {
  try {
    // This is a simplified approach - in a real implementation, 
    // we would need to properly import the data modules
    const videoDataContent = fs.readFileSync(videoDataPath, 'utf8');
    const blogDataContent = fs.readFileSync(blogDataPath, 'utf8');
    
    // Extract content names for prefetching (simplified)
    const videoMatches = videoDataContent.match(/name_video:\s*['"]([^'"]+)['"]/g) || [];
    const blogMatches = blogDataContent.match(/name_blog:\s*['"]([^'"]+)['"]/g) || [];
    
    const videoNames = videoMatches.map(match => {
      const nameMatch = match.match(/name_video:\s*['"]([^'"]+)['"]/);
      return nameMatch ? nameMatch[1] : null;
    }).filter(Boolean);
    
    const blogNames = blogMatches.map(match => {
      const nameMatch = match.match(/name_blog:\s*['"]([^'"]+)['"]/);
      return nameMatch ? nameMatch[1] : null;
    }).filter(Boolean);
    
    // Get top items for each type (first 10)
    const topVideoItems = videoNames.slice(0, 10);
    const topBlogItems = blogNames.slice(0, 10);
    
    // Get common categories
    const categoryMatches = [...videoDataContent.matchAll(/related_categories:\s*\[(.*?)\]/gs), 
                             ...blogDataContent.matchAll(/related_categories:\s*\[(.*?)\]/gs)];
    
    const allCategories = new Set();
    
    categoryMatches.forEach(match => {
      if (match[1]) {
        const categoriesStr = match[1];
        const categoryItems = categoriesStr.match(/['"]([^'"]+)['"]/g) || [];
        categoryItems.forEach(cat => {
          const cleanCategory = cat.replace(/['"]/g, '');
          if (cleanCategory) allCategories.add(cleanCategory);
        });
      }
    });
    
    // Create prefetch data
    const prefetchData = {
      topVideoItems,
      topBlogItems,
      commonCategories: Array.from(allCategories).slice(0, 15), // Top 15 categories
      lastUpdated: new Date().toISOString()
    };
    
    // Write prefetch data to file
    fs.writeFileSync(
      prefetchDataPath, 
      JSON.stringify(prefetchData, null, 2)
    );
    
    console.log(`✅ Prefetch data generated successfully at ${prefetchDataPath}`);
    
  } catch (error) {
    console.error('❌ Error generating prefetch data:', error);
    process.exit(1);
  }
}

// Run the script
extractContentData(); 