// Type for video content
export interface VideoContent {
  name_video: string;
  description_video: string;
  related_categories: string[];
  page_url: string;
  youtube_url: string;
  mp3_file: string;
  mp3_content: string;
}

// Type for blog content
export interface BlogPost {
  // id: string;
  name_blog: string;
  description_blog: string;
  page_url?: string;
  authors: string[];
  related_categories: string[];
  content: {
    table_of_contents: string[];
    whole_content: string;
  };
  image_url?: string;
  date_published?: string;
}

// Type for user recommendations
export interface UserRecommendations {
  contentBasedRecs: string[]; // Content IDs based on user's viewing history
  categoryBasedRecs: string[]; // Content IDs based on user's category preferences
  popularRecs: string[]; // Content IDs of popular content
  lastUpdated: Date; // When recommendations were last updated
}

// Type for related content
export interface RelatedContent {
  contentId: string;
  similarityScore: number;
}

// Type for library filter state
export interface LibraryFilters {
  contentTypes: {
    video: boolean;
    blog: boolean;
  };
  categories: {
    [key: string]: boolean;
  };
}

// Union type for content items
export type ContentItem = VideoContent | BlogPost;

// Type guard to check if content item is a video
export function isVideoContent(item: ContentItem): item is VideoContent {
  return 'name_video' in item;
}

// Type guard to check if content item is a blog post
export function isBlogPost(item: ContentItem): item is BlogPost {
  return 'name_blog' in item;
}

// Categories for video and blog content
export const VIDEO_CATEGORIES = [
  "Advisers",
  "Applying to YC",
  "Artificial Intelligence",
  "B2B",
  "Becoming a Founder",
  "Board Management",
  "Building Product",
  "Business Models",
  "Cash Burn",
  "Co-Founders",
  "College Students",
  "Culture",
  "Customers",
  "Decision Making",
  "Design",
  "Diversity + Inclusion",
  "Early Stage",
  "Engineering",
  "Enterprise Sales",
  "Experimentation",
  "Feature Prioritization",
  "Finance",
  "Founder Psychology",
  "Founder Stories",
  "Fundraising",
  "Getting Started",
  "Growth",
  "Growth Stage",
  "Hiring",
  "Investors",
  "KPI",
  "Launch",
  "Leadership",
  "Legal",
  "MVP",
  "Management",
  "Management ",
  "Marketing",
  "Mental Health",
  "Monetization",
  "Motivation",
  "Negotiation",
  "Non-Technical Founders",
  "Office Hours",
  "Office Hours ",
  "People",
  "Pitch Deck",
  "Pivoting",
  "Press",
  "Pricing",
  "Problems to Solve",
  "Product",
  "Product Market Fit",
  "Recruiting",
  "Retention",
  "Safes",
  "Startup Ideas",
  "Staying Alive",
  "Stock Equity",
  "Talking to Users",
  "Technical",
  "Time Management",
  "UX + Design",
  "Valuations",
  "Women Founders",
  "Working at a Startup",
  "YC",
  "startup school"
];

export const BLOG_CATEGORIES = [
  "Academia to Startup",
  "Becoming a Founder",
  "Board Management",
  "Building Product",
  "Business Models",
  "CEO",
  "CTO",
  "Cash Burn",
  "China",
  "Co-Founders",
  "College Students",
  "Compensation",
  "Consumer",
  "Culture",
  "Customers",
  "Decision Making",
  "Early Stage",
  "Engineering",
  "Enterprise Sales",
  "Feature Prioritization",
  "Finance",
  "Founder Psychology",
  "Founder Stories",
  "Fundraising",
  "Fundraising Docs",
  "Growth",
  "Growth Stage",
  "Hiring",
  "International",
  "Investors",
  "KPI",
  "Leadership",
  "MVP",
  "Management",
  "People",
  "Pitch Deck",
  "Press",
  "Product",
  "Product Market Fit",
  "Real Estate",
  "Recruiting",
  "Retention",
  "Science + Biotech",
  "Seed Round",
  "Series A",
  "Staying Alive",
  "Talking to Users",
  "Technical",
  "Unit Economics",
  "Valuations",
  "Working at a Startup",
  "YC",
  "YC Demo Day"
];

// Combined unique categories (for filtering)
export const ALL_CATEGORIES = [...new Set([...VIDEO_CATEGORIES, ...BLOG_CATEGORIES])].sort();

// Define interfaces for the blog and video content

export interface VideoItem {
  id: string;
  name_video: string;
  description_video: string;
  video_url?: string;
  author: string;
  duration?: string;
  related_categories: string[];
  key_points: string[];
  transcript?: string;
  thumbnail_url: string;
  date_published?: string;
}

// Add other types as needed for the application 