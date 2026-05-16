export interface HelpGuide {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  timeEstimate: number; // minutes
  tags: string[];
  content: string;
  relatedGuides: string[];
  walkthroughId?: string;
}

export interface Walkthrough {
  id: string;
  title: string;
  description: string;
  steps: WalkthroughStep[];
  estimatedTime: number; // minutes
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface WalkthroughStep {
  number: number;
  title: string;
  description: string;
  action: string;
  tips: string[];
  validation?: {
    question: string;
    correctAnswers: string[];
  };
}

// ===== TIER 1 GUIDES =====
export const TIER1_BATCH_OPERATIONS: HelpGuide = {
  id: "tier1-batch-operations",
  title: "Batch Operations: Bulk Actions",
  description: "Learn how to perform bulk operations on multiple content items",
  category: "Tier 1",
  difficulty: "intermediate",
  timeEstimate: 8,
  tags: ["batch", "bulk", "operations", "efficiency"],
  content: `# Batch Operations Guide

## Overview
Batch Operations allow you to perform actions on multiple content items simultaneously, saving time and ensuring consistency.

## Key Features
- **Bulk Publish**: Publish multiple drafts at once
- **Bulk Unpublish**: Revert published content to draft status
- **Bulk Archive**: Move multiple items to archive
- **Bulk Delete**: Remove multiple items permanently
- **Bulk Edit**: Apply changes to multiple items

## Getting Started

### Selecting Items
1. Navigate to the CMS dashboard
2. Use checkboxes to select multiple content items
3. Your selected count appears in the batch panel

### Performing Batch Actions
1. Open the Batch Operations tab in Enterprise Features
2. Select your desired action (Publish, Unpublish, Archive, Delete)
3. Confirm the action
4. Track progress in the operations list

## Best Practices
- Review content before bulk publishing
- Archive content instead of deleting (more recoverable)
- Batch edit is useful for status updates
- Check operation status in the history

## Workflow Example
**Scenario**: Publishing 50 recipe articles

1. Select all 50 recipe items in the CMS
2. Click "Publish All" in Batch Operations
3. System processes in the background
4. Receive notification when complete
5. View any failed items (e.g., missing images)

## Tips
- Use filters to select items more precisely
- Batch operations run asynchronously (you can continue working)
- Failed items are logged with specific error messages
- Operations are logged for audit trails

## Troubleshooting
- **Operation Failed**: Check that you have permission for the action
- **Items Not Selected**: Refresh the page and reselect items
- **Slow Processing**: Large batches (1000+) may take several minutes
`,
  relatedGuides: ["tier1-seo-generator", "tier1-analytics"],
};

export const TIER1_SEO_GENERATOR: HelpGuide = {
  id: "tier1-seo-generator",
  title: "SEO Metadata Generator",
  description: "Generate optimized SEO metadata for your content using AI",
  category: "Tier 1",
  difficulty: "beginner",
  timeEstimate: 10,
  tags: ["seo", "metadata", "optimization", "ai"],
  content: `# SEO Metadata Generator Guide

## What is SEO Metadata?
SEO metadata helps search engines understand your content and improves your visibility in search results.

## Components Generated
1. **Title Tag** (60 characters max): Main headline in search results
2. **Meta Description** (160 characters max): Preview text under the title
3. **Keywords**: Relevant search terms for your content
4. **Open Graph Tags**: Preview when shared on social media
5. **Readability Score**: Quality indicator (0-100)
6. **Keyword Density**: Analysis of keyword frequency

## How to Use

### Generate SEO Metadata
1. Open the SEO Generator tab
2. Select a content item
3. Click "Generate SEO Metadata"
4. Review the AI-generated suggestions
5. Save or edit the metadata

### Interpreting Results
- **Readability Score**: 70+ is good, 85+ is excellent
- **Keyword Density**: 1-3% is optimal
- **Suggestions**: AI recommends improvements

### Manual Editing
You can always edit the generated metadata:
1. Click "Edit" on any field
2. Modify the content
3. Save changes

## SEO Best Practices
- Use target keywords naturally
- Keep titles descriptive and compelling
- Write descriptions that encourage clicks
- Use Open Graph images (1200x630px recommended)
- Include relevant keywords in headings

## Example
**Content**: "Chocolate Lava Cake Recipe"

**Generated SEO**:
- Title: "Easy Chocolate Lava Cake Recipe | Gourmet Dessert"
- Description: "Learn how to make a restaurant-quality chocolate lava cake at home. Step-by-step recipe with tips for perfect results every time."
- Keywords: "chocolate lava cake, dessert recipe, easy cake"

## Generating Sitemaps
The system automatically generates XML sitemaps for search engines:
- Includes all published content
- Updates when content is published/modified
- Improves indexing for new content

## Advanced Features
- **Keyword Research**: Identify high-value keywords
- **Competitor Analysis**: See what keywords competitors use
- **Content Recommendations**: Improve existing content
`,
  relatedGuides: ["tier1-analytics"],
};

export const TIER1_CONTENT_RELATIONS: HelpGuide = {
  id: "tier1-content-relations",
  title: "Content Relations: Linking Content",
  description: "Create meaningful connections between related content items",
  category: "Tier 1",
  difficulty: "intermediate",
  timeEstimate: 7,
  tags: ["relations", "linking", "structure", "organization"],
  content: `# Content Relations Guide

## What are Content Relations?
Relations create structured connections between content items, helping organize complex information and improving user navigation.

## Relation Types
1. **references**: A points to B for more information
2. **related**: A is related to B (bidirectional)
3. **ingredients**: A is made from B
4. **requires**: A depends on B
5. **depends_on**: A requires B to work

## Creating Relations

### Step 1: Select Source Content
1. Open Content Relations tab
2. Select the content item
3. Load its relations

### Step 2: Create New Relation
1. Click "Create Relation"
2. Select target content
3. Choose relation type
4. Save

### Example: Recipe Relations
**Recipe**: "Chocolate Lava Cake"

Can have relations to:
- **Ingredients** (references): Chocolate, Butter, Eggs
- **Related** (recipes): "Chocolate Mousse", "Cake Decorating"
- **Requires** (techniques): "Tempering Chocolate", "Baking Fundamentals"

## Viewing Content Graph
The system shows all connections as a graph:
- **Nodes**: Individual content items
- **Edges**: Relations between them
- **Depth**: How many levels of connections to show

### Traversing the Graph
1. Click on any node to see its connections
2. Expand to see related content
3. Use filters to focus on specific relation types

## Benefits
- **Better Navigation**: Users find related content easily
- **Content Reuse**: Link similar information
- **Structure**: Organize complex domains (recipes → ingredients)
- **SEO**: Internal linking helps search engines
- **Engagement**: Related content keeps users on site

## Best Practices
- Keep relations intentional and relevant
- Review regularly for broken links
- Use consistent relation types
- Document your relation strategy

## Advanced Usage
**Content Graph for Events**:
- Event → Courses → Recipes → Ingredients
- Event → Guest Profiles → Dietary Restrictions
- Event → Bookings → Payment Status

## Bulk Relation Management
For large projects:
1. Use batch operations to manage multiple relations
2. Export relations as data
3. Import relations in bulk
`,
  relatedGuides: ["tier1-batch-operations"],
};

export const TIER1_ANALYTICS: HelpGuide = {
  id: "tier1-analytics",
  title: "Analytics Dashboard: Tracking Performance",
  description: "Monitor content performance and user engagement metrics",
  category: "Tier 1",
  difficulty: "beginner",
  timeEstimate: 12,
  tags: ["analytics", "metrics", "performance", "insights"],
  content: `# Analytics Dashboard Guide

## Overview
The Analytics Dashboard provides real-time insights into how your content is performing and how users are engaging with it.

## Key Metrics

### Engagement Metrics
- **Views**: Total number of times content was viewed
- **Unique Viewers**: Number of distinct users
- **Average Time on Page**: How long users spend reading
- **Bounce Rate**: Percentage who leave without interacting

### Interaction Metrics
- **Likes**: Number of positive interactions
- **Comments**: User feedback and discussions
- **Shares**: Content shared on social media
- **Engagement Score**: Overall engagement (0-100)

### Trending Metrics
- **Trending Score**: How popular content is right now
- **Trend Direction**: Is engagement increasing or decreasing
- **Rank**: Position compared to other content

## Using the Dashboard

### View Overview
1. Open Analytics Dashboard (blank content ID)
2. See summary stats: total content, published, draft, review
3. View top 10 performing content
4. See recent additions

### View Specific Content
1. Enter content ID
2. Click "Load Analytics"
3. View detailed metrics
4. See performance trends

### Interpreting Trends
- **Green**: Content is performing well, increasing engagement
- **Yellow**: Stable performance, consider promotion
- **Red**: Declining engagement, consider updates

## Performance Benchmarks
**Good Performance**:
- Views: 100+ per month
- Engagement Score: 70+
- Comments: 10+ per month
- Share Rate: 5%+

**Excellent Performance**:
- Views: 1000+ per month
- Engagement Score: 85+
- Comments: 50+ per month
- Share Rate: 10%+

## Getting Insights

### What's Trending?
1. Open Analytics Dashboard
2. View "Trending Content" section
3. See what's popular right now
4. Consider promoting trending content

### Content Quality
- Readability Score: How easy is content to understand
- Engagement Score: Are users liking it
- Comments: What are they saying

### Audience Behavior
- Time on Page: Are they reading it fully
- Bounce Rate: Are they interested
- Return Rate: Do they come back

## Taking Action

### Boost Underperforming Content
1. Check analytics to identify issues
2. Update content based on feedback
3. Improve SEO metadata
4. Promote via social media
5. Monitor changes in analytics

### Double Down on Winners
1. Create related content
2. Cross-link from other pages
3. Feature in promotions
4. Consider as template for future content

## Advanced Analysis

### Cohort Analysis
Track content performance by:
- Content type
- Author
- Publication date
- Topic/category

### Comparative Analysis
Compare performance:
- Month over month
- Content type comparison
- Author comparison
- Topic analysis

## Exporting Data
1. Click "Export as CSV"
2. Open in spreadsheet software
3. Create custom reports
4. Share with team

## Best Practices
- Check analytics weekly
- Act on insights (don't just observe)
- Set goals for key metrics
- Share successes with team
- Celebrate trending content
`,
  relatedGuides: ["tier1-seo-generator"],
};

export const TIER1_ASSET_MANAGEMENT: HelpGuide = {
  id: "tier1-asset-management",
  title: "Asset Management: Organizing Media",
  description: "Upload, organize, and manage your media files efficiently",
  category: "Tier 1",
  difficulty: "beginner",
  timeEstimate: 9,
  tags: ["assets", "media", "images", "videos", "files"],
  content: `# Asset Management Guide

## What is Asset Management?
Centralized storage and organization of all your media files (images, videos, documents, audio) with version control and usage tracking.

## Asset Types
- **Images**: JPG, PNG, GIF, WebP (optimized for web)
- **Videos**: MP4, WebM, MOV (streaming ready)
- **Documents**: PDF, DOC, DOCX (shareable)
- **Audio**: MP3, WAV, M4A (for podcasts, announcements)

## Uploading Assets

### Single Asset Upload
1. Open Asset Management tab
2. Click "Upload Asset"
3. Select file from computer
4. Add metadata (alt text, description, tags)
5. Click "Save"

### Bulk Upload
1. Select multiple files
2. Upload all at once
3. Add tags (applies to all)
4. System processes in background

## Organizing Assets

### Using Tags
- Add relevant tags to assets
- Examples: "recipe-photo", "event-cover", "ingredient"
- Search by tags for quick filtering

### Using Folders
- Organize by category
- Examples: "/recipes", "/events", "/staff"
- Easy navigation and management

### Using Filters
1. Filter by type (images, videos, etc.)
2. Filter by tags
3. Filter by date uploaded
4. Search by file name

## Asset Metadata

### Required Fields
- **File Name**: Descriptive name
- **Asset Type**: Classification (image, video, etc.)

### Recommended Fields
- **Alt Text**: Description for accessibility and SEO
- **Description**: Details about the asset
- **Tags**: Keywords for organization

### File Information
- **Size**: Storage used (helps with limits)
- **Dimensions**: Width/height for images
- **Mime Type**: Technical file format
- **Upload Date**: When added to system

## Asset Versioning

### Creating Versions
1. Select asset
2. Click "New Version"
3. Upload updated file
4. System keeps history

### Reverting to Previous Version
1. Click "Version History"
2. Select desired version
3. Click "Revert"
4. Confirm action

## Using Assets in Content

### Linking Assets
1. In content editor, click "Insert Image/Video"
2. Select from Asset Library
3. Asset link is created
4. Usage is tracked

### Viewing Usage
1. Open asset
2. Click "View Usage"
3. See all content using this asset
4. Easy to find what needs updating if asset changes

## Asset Statistics

### Understanding Stats
- **Total Assets**: Count of all media in system
- **Total Size**: Storage space used
- **Most Used**: Assets used in many content items
- **By Type**: Breakdown by asset type

### Storage Management
- Monitor total storage used
- Remove unused assets to free space
- Archive instead of delete for safety
- Regular cleanup prevents waste

## Best Practices

### Naming Conventions
- Use descriptive names
- Include date if relevant
- Examples: "event-2024-wedding-venue", "recipe-chocolate-cake-final"

### Organization
- Use consistent tag naming
- Keep folder structure logical
- Archive old/unused assets
- Document your system

### Quality Standards
- Compress images before upload (70-80 KB ideal)
- Use appropriate format (JPG for photos, PNG for graphics)
- Check dimensions are sufficient
- Verify alt text is descriptive

### Reusability
- Create reusable asset library
- Brand guidelines in assets
- Standard templates and backgrounds
- Easy sharing with team

## Troubleshooting
- **Upload Fails**: Check file size (usually 50MB max)
- **Image Looks Blurry**: Original may be low resolution
- **Can't Find Asset**: Use search or filter features
- **Size Too Large**: Compress or resize before upload
`,
  relatedGuides: ["tier1-batch-operations"],
};

// ===== TIER 2 GUIDES (Preview) =====
export const TIER2_WORKSPACES: HelpGuide = {
  id: "tier2-workspaces",
  title: "Team Workspaces: Collaboration",
  description: "Create isolated workspaces for team collaboration",
  category: "Tier 2",
  difficulty: "intermediate",
  timeEstimate: 15,
  tags: ["workspaces", "teams", "collaboration", "isolation"],
  content: `# Team Workspaces Guide

## Overview
Team Workspaces allow you to create isolated environments for different teams, projects, or clients.

## Creating a Workspace
1. Open Workspace Manager
2. Click "Create Workspace"
3. Enter name and description
4. Set workspace visibility (private/shared)
5. Add team members

## Workspace Features
- Isolated content (each workspace has own content)
- Separate permissions (different roles per team)
- Individual settings (themes, languages, integrations)
- Audit logs (track changes within workspace)

## Managing Teams
- Add/remove members
- Assign roles (admin, editor, reviewer, viewer)
- Control what content they can access
- Track activity and contributions

## Best Practices
- One workspace per major project
- Clear naming convention
- Document workspace purpose
- Regular permission reviews
`,
  relatedGuides: ["tier2-advanced-roles"],
};

// ===== WALKTHROUGHS =====
export const WALKTHROUGH_BATCH_OPERATIONS: Walkthrough = {
  id: "walkthrough-batch-operations",
  title: "First Time: Batch Publishing Content",
  description: "Learn how to publish multiple content items at once",
  estimatedTime: 5,
  difficulty: "beginner",
  steps: [
    {
      number: 1,
      title: "Navigate to CMS",
      description: "Go to the Content Management System dashboard",
      action: "Click 'CMS' in the main menu",
      tips: [
        "The CMS dashboard shows all your content",
        "You can filter by status, type, or language",
      ],
    },
    {
      number: 2,
      title: "Select Content Items",
      description: "Choose multiple items to publish",
      action: "Check the boxes next to draft content items",
      tips: [
        "You can select items one by one",
        "Use 'Select All' to select multiple at once",
        "Selected count appears in toolbar",
      ],
      validation: {
        question: "How many items should you select before batch publishing?",
        correctAnswers: ["At least 1", "One or more", "Any number"],
      },
    },
    {
      number: 3,
      title: "Open Batch Operations",
      description: "Access the batch operations panel",
      action: "Click 'Batch Operations' tab in the Interact section",
      tips: [
        "Make sure you're in the Interact tab of the Studio",
        "The panel shows all 5 Tier 1 features",
      ],
    },
    {
      number: 4,
      title: "Choose Publish Action",
      description: "Select the publish action",
      action: "Click 'Publish All' button",
      tips: [
        "The button shows how many items will be affected",
        "Review content before publishing",
        "Published content is public",
      ],
    },
    {
      number: 5,
      title: "Confirm Action",
      description: "Confirm that you want to publish",
      action: "Click 'Confirm' in the dialog",
      tips: [
        "This action can be undone using batch unpublish",
        "Processing happens in background",
      ],
    },
    {
      number: 6,
      title: "Monitor Progress",
      description: "Track the publishing process",
      action: "Watch the operation status in the panel",
      tips: [
        "Green checkmark = completed",
        "Yellow clock = processing",
        "Red X = failed (check error details)",
        "You can continue working while publishing",
      ],
    },
  ],
};

export const WALKTHROUGH_SEO_GENERATION: Walkthrough = {
  id: "walkthrough-seo-generation",
  title: "Generating SEO Metadata for Your First Article",
  description: "Learn how to optimize your content for search engines",
  estimatedTime: 4,
  difficulty: "beginner",
  steps: [
    {
      number: 1,
      title: "Open SEO Generator",
      description: "Access the SEO metadata generator",
      action: "Click 'SEO' tab in Tier1EnterprisePanel",
      tips: [
        "You need a published or draft article first",
        "The generator works with all content types",
      ],
    },
    {
      number: 2,
      title: "Select Content",
      description: "Choose which content to optimize",
      action: "Enter the content ID or select from dropdown",
      tips: [
        "Find content ID in the CMS dashboard",
        "You can optimize content before or after publishing",
      ],
    },
    {
      number: 3,
      title: "Generate Metadata",
      description: "Let AI generate optimized metadata",
      action: "Click 'Generate SEO Metadata' button",
      tips: [
        "AI analyzes your content automatically",
        "Processing takes 10-30 seconds",
        "Check your internet connection if it fails",
      ],
      validation: {
        question: "What does the readability score measure?",
        correctAnswers: [
          "How easy content is to understand",
          "Readability",
          "Content quality",
        ],
      },
    },
    {
      number: 4,
      title: "Review Results",
      description: "Check the generated metadata",
      action: "Review title, description, and keywords",
      tips: [
        "Title: Should be 50-60 characters",
        "Description: Should be 150-160 characters",
        "Keywords: Use 3-5 relevant keywords",
        "Readability: Aim for 70+ score",
      ],
    },
    {
      number: 5,
      title: "Customize if Needed",
      description: "Edit any fields that don't match your vision",
      action: "Click 'Edit' next to any field you want to change",
      tips: [
        "AI is a starting point, customize for your brand voice",
        "Keep metadata aligned with actual content",
        "Test different versions to see what works",
      ],
    },
    {
      number: 6,
      title: "Save Metadata",
      description: "Finalize your SEO settings",
      action: "Click 'Save SEO Metadata'",
      tips: [
        "Changes are saved immediately",
        "Check your content in search results",
        "Update periodically as content ages",
        "Good SEO improves visibility",
      ],
    },
  ],
};

// Export all guides
export const ALL_TIER1_GUIDES = [
  TIER1_BATCH_OPERATIONS,
  TIER1_SEO_GENERATOR,
  TIER1_CONTENT_RELATIONS,
  TIER1_ANALYTICS,
  TIER1_ASSET_MANAGEMENT,
];

export const ALL_TIER2_GUIDES = [TIER2_WORKSPACES];

export const ALL_GUIDES = [...ALL_TIER1_GUIDES, ...ALL_TIER2_GUIDES];

export const ALL_WALKTHROUGHS = [
  WALKTHROUGH_BATCH_OPERATIONS,
  WALKTHROUGH_SEO_GENERATION,
];
