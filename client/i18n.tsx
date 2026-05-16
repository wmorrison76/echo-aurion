import React from "react";
import {
  changeLanguage as syncChangeLanguage,
  initLanguageSync,
} from "@/lib/language-sync";

export type Lang = "en" | "es" | "fr" | "de" | "ja" | "pt";

type Dict = Record<string, string>;

interface TranslationOptions {
  context?: string;
  skipCache?: boolean;
  skipTranslation?: boolean;
}

const LANGUAGE_NAMES: Record<Lang, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  zh: "Chinese",
  ar: "Arabic",
  nl: "Dutch",
};

// Translation cache with localStorage persistence
const translationCache: Record<string, Record<Lang, string>> = {};
const CACHE_KEY = "translation-cache";
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

// Load cache from localStorage on init
try {
  const stored = localStorage.getItem(CACHE_KEY);
  if (stored) {
    const cache = JSON.parse(stored);
    Object.assign(translationCache, cache);
  }
} catch (e) {
  console.warn("Failed to load translation cache");
}

// Debounced cache save
let saveCacheTimeout: NodeJS.Timeout | null = null;
const saveCache = () => {
  if (saveCacheTimeout) clearTimeout(saveCacheTimeout);
  saveCacheTimeout = setTimeout(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(translationCache));
    } catch (e) {
      console.warn("Failed to save translation cache");
    }
  }, 5000);
};

async function translateText(
  text: string,
  targetLang: Lang,
  context?: string,
): Promise<string> {
  // Return if empty or already English
  if (!text || !text.trim() || targetLang === "en") {
    return text;
  }

  const cacheKey = context ? `${text}:${context}` : text;
  if (translationCache[cacheKey]?.[targetLang]) {
    return translationCache[cacheKey][targetLang];
  }

  try {
    const apiKey =
      import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn("OpenAI API key not configured");
      return text;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Translate to ${LANGUAGE_NAMES[targetLang]}${
              context ? ` (context: ${context})` : ""
            }. Return ONLY the translated text, no explanations.`,
          },
          { role: "user", content: text },
        ],
        temperature: 0.3,
        max_tokens: Math.min(Math.ceil(text.length * 1.5), 2000),
      }),
    });

    if (!response.ok) {
      throw new Error("Translation API error");
    }

    const data = (await response.json()) as any;
    const translation = data.choices?.[0]?.message?.content?.trim() || text;

    // Cache result
    if (!translationCache[cacheKey]) {
      translationCache[cacheKey] = { timestamp: Date.now() } as any;
    }
    translationCache[cacheKey][targetLang] = translation;
    saveCache();

    return translation;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}

const dictionaries: Record<Lang, Dict> = {
  en: {
    /* Navigation */
    "nav.home": "Home",
    "nav.dashboard": "Dashboard",
    "nav.culinary": "Culinary",
    "nav.pastry": "Pastry",
    "nav.schedule": "Schedule",
    "nav.inventory": "Inventory",
    "nav.maestro": "Maestro BQT",
    "nav.mixology_sommelier": "Mixology & Sommelier",
    "nav.chefnet": "ChefNet",
    "nav.support": "Support",
    "nav.whiteboard": "Whiteboard",
    "nav.video": "Video Conference",
    "nav.canvas": "Canvas Studio",
    "nav.notes": "Sticky Notes",

    /* Sidebar Labels */
    "sidebar.maestroBQT": "Maestro BQT",
    "sidebar.orderingInventory": "Ordering & Inventory",
    "sidebar.purchasingReceiving": "Purchasing & Receiving",
    "sidebar.mixologySommelier": "Mixology & Sommelier",
    "sidebar.echoAurum": "EchoAurum",
    "sidebar.echoStratus": "EchoStratus",
    "sidebar.echoEvents": "Echo Events",
    "sidebar.echoLayout": "EchoLayout",
    "sidebar.coreOperations": "Core Operations",
    "sidebar.financialSupply": "Financial & Supply",
    "sidebar.designAnalytics": "Design & Analytics",
    "sidebar.communitySupport": "Community & Support",

    /* Toolbar */
    "toolbar.theme": "Theme",
    "toolbar.light": "Light",
    "toolbar.dark": "Dark",
    "toolbar.colors": "Color Scheme",
    "toolbar.language": "Language",
    "toolbar.cyan": "Cyan",
    "toolbar.blue": "Blue",
    "toolbar.emerald": "Emerald",
    "toolbar.violet": "Violet",
    "toolbar.rose": "Rose",

    /* Common Actions */
    "action.close": "Close",
    "action.minimize": "Minimize",
    "action.maximize": "Maximize",
    "action.popout": "Pop Out",
    "action.pin": "Pin",
    "action.save": "Save",
    "action.cancel": "Cancel",
    "action.delete": "Delete",
    "action.edit": "Edit",
    "action.add": "Add",
    "action.search": "Search",
    "action.share": "Share",
    "action.view": "View",
    "action.open": "Open",
    "action.back": "Back",
    "action.next": "Next",
    "action.submit": "Submit",

    /* Module Titles */
    "module.dashboard": "Dashboard",
    "module.culinary": "EchoRecipePro",
    "module.pastry": "CakeBuilder",
    "module.schedule": "Production Schedule",
    "module.inventory": "Inventory Management",
    "module.maestro": "Kitchen Management",
    "module.mixology_sommelier": "Mixology & Sommelier",
    "module.chefnet": "Team Collaboration",
    "module.support": "Help Desk",
    "module.whiteboard": "Whiteboard",
    "module.video": "Video Conference",
    "module.canvas": "Canvas Studio",
    "module.notes": "Notes",

    /* Panel Titles */
    "panel.dashboard": "Dashboard",
    "panel.culinary": "Culinary",
    "panel.culinary_sidebar": "Recipe Properties",
    "panel.pastry": "Pastry",
    "panel.schedule": "Schedule",
    "panel.inventory": "Inventory",
    "panel.maestro": "Maestro BQT",
    "panel.maestro_sidebar": "BQT Monitor",
    "panel.mixology_sommelier": "Mixology & Sommelier",
    "panel.chefnet": "ChefNet",
    "panel.support": "Support",
    "panel.whiteboard": "Whiteboard",
    "panel.video": "Video Conference",
    "panel.studio": "Canvas Studio",
    "panel.notes": "Sticky Notes",
    "panel.purchasing": "Purchasing & Receiving",
    "panel.aurum": "EchoAurum",
    "panel.layout": "EchoLayout",
    "panel.events": "EchoEvents",
    "panel.stratus": "EchoStratus",
    "panel.demand": "Demand Forecasting",
    "panel.pricing": "Dynamic Pricing",
    "panel.staffing": "Staff Optimization",
    "panel.scheduling": "Auto-Scheduling",
    "panel.revenue": "Revenue Operations",
    "panel.costs": "Cost Management",
    "panel.qa": "Quality Assurance",
    "panel.guest": "Guest Experience",
    "panel.supply": "Supply Chain",
    "panel.voice": "Voice Commands",
    "panel.canvas": "Unified Canvas",
    "panel.ai-chef": "AI Cooking Assistant",
    "panel.maintenance": "Predictive Maintenance",
    "panel.templates": "Template Marketplace",
    "panel.network": "Supplier Network",
    "panel.benchmark": "Data Collective",
    "panel.zaro": "ZARO Guardian",
    "panel.settings": "Settings",
    "panel.echo": "EchoCoder",
    "panel.network-chat": "Network Chat",
    "panel.chat-settings": "Chat Settings",
    "panel.culinary2": "Culinary 2",

    /* Culinary 2 – all UI strings for language switching */
    "culinary2.title": "Culinary 2",
    "culinary2.selectSection": "Select a section.",
    "culinary2.section.navigation": "NAVIGATION",
    "culinary2.section.innovation_rnd": "INNOVATION & R&D",
    "culinary2.section.operations": "OPERATIONS",
    "culinary2.section.supply_chain": "SUPPLY CHAIN",
    "culinary2.section.analysis_compliance": "ANALYSIS & COMPLIANCE",
    "culinary2.nav.echo-training": "ECHO TRAINING",
    "culinary2.nav.search": "RECIPES",
    "culinary2.nav.add-recipe": "ADD RECIPE",
    "culinary2.nav.menu-studio": "MENU DESIGN STU",
    "culinary2.nav.gallery": "GALLERY",
    "culinary2.nav.dish-assembly": "DISH ASSEMBLY",
    "culinary2.nav.menu-builder": "MENU BUILDER",
    "culinary2.nav.rd-labs": "RD LABS",
    "culinary2.nav.production": "PRODUCTION",
    "culinary2.nav.server-notes": "SERVER NOTES",
    "culinary2.nav.operations-docs": "OPERATIONS DOCS",
    "culinary2.nav.tablet-waste": "TABLET WASTE",
    "culinary2.nav.tablet-transfer": "TABLET TRANSFER",
    "culinary2.nav.purchasing": "PURCH/REC",
    "culinary2.nav.inventory-transfer": "INVENTORY TRANS",
    "culinary2.nav.costing": "COSTING",
    "culinary2.nav.haccp": "HACCP/Compliance",
    "culinary2.nav.waste-tracking": "WASTE TRACKING",
    "culinary2.nav.nutrition": "Nutrition/Allergens",
    "culinary2.recipes.title": "Recipes",
    "culinary2.recipes.searchPlaceholder": "Search by name…",
    "culinary2.recipes.filterAll": "All",
    "culinary2.recipes.filterRecent": "Recent",
    "culinary2.recipes.filterFavorites": "Favorites",
    "culinary2.recipes.noRecipes": "No recipes yet. Add or import to get started.",
    "culinary2.recipes.sectionContent": "Section content will go here.",
    "culinary2.recipes.viewList": "List view",
    "culinary2.recipes.viewGrid": "Grid view",
    "culinary2.recipes.global": "Global",
    "culinary2.recipes.open": "Open",
    "culinary2.recipes.loading": "Loading…",
    "culinary2.recipes.noImage": "No image",
    "culinary2.recipes.export": "Export",
    "culinary2.recipes.exportTxt": "TXT",
    "culinary2.recipes.exportZip": "ZIP",
    "culinary2.recipes.exportEmail": "Email",
    "culinary2.recipes.exportSms": "SMS",
    "culinary2.recipes.import": "Import",
    "culinary2.recipes.importLoading": "Loading file…",
    "culinary2.recipes.importPages": "Scanning page",
    "culinary2.recipes.importParsing": "Parsing recipes…",
    "culinary2.recipes.importDone": "Imported",
    "culinary2.recipes.print": "Print",
    "culinary2.sidebar.close": "Close sidebar",
    "culinary2.sidebar.open": "Open sidebar",

    "culinary2.addRecipe.recipeName": "Recipe name",
    "culinary2.addRecipe.recipeNamePlaceholder": "Enter recipe name",
    "culinary2.addRecipe.ingredients": "Ingredients",
    "culinary2.addRecipe.addIngredient": "Add row",
    "culinary2.addRecipe.colQty": "Qty",
    "culinary2.addRecipe.colUnit": "Unit",
    "culinary2.addRecipe.colItem": "Item",
    "culinary2.addRecipe.colPrep": "Prep",
    "culinary2.addRecipe.colLink": "Link to inventory",
    "culinary2.addRecipe.colYield": "Yield %",
    "culinary2.addRecipe.colCost": "Cost",
    "culinary2.addRecipe.totalCost": "Total cost",
    "culinary2.addRecipe.searchInventory": "Search inventory…",
    "culinary2.addRecipe.noMatches": "No matches",
    "culinary2.addRecipe.unlink": "Unlink",
    "culinary2.addRecipe.removeRow": "Remove row",
    "culinary2.addRecipe.itemPlaceholder": "Ingredient name",
    "culinary2.addRecipe.directions": "Directions",
    "culinary2.addRecipe.directionsPlaceholder": "1. Step one…",
    "culinary2.addRecipe.saveRecipe": "Save recipe",
    "culinary2.addRecipe.saving": "Saving…",
    "culinary2.addRecipe.loading": "Loading…",
    "culinary2.addRecipe.cancel": "Cancel",

    "culinary2.rightSidebar.title": "Import & metadata",
    "culinary2.rightSidebar.closePanel": "Close panel",
    "culinary2.rightSidebar.openPanel": "Open panel",
    "culinary2.rightSidebar.importTitle": "Recipe ingestion",
    "culinary2.rightSidebar.recipeUrlPlaceholder": "Enter recipe URL",
    "culinary2.rightSidebar.paste": "Paste",
    "culinary2.rightSidebar.recipeImage": "Recipe image",
    "culinary2.rightSidebar.editImage": "Edit image",
    "culinary2.rightSidebar.recipeType": "Recipe type",
    "culinary2.rightSidebar.status": "Status",
    "culinary2.rightSidebar.statusActive": "Active",
    "culinary2.rightSidebar.statusDraft": "In Development",
    "culinary2.rightSidebar.statusArchived": "Archived",
    "culinary2.rightSidebar.recipeAccess": "Recipe access",
    "culinary2.rightSidebar.makeGlobal": "Make global recipe",
    "culinary2.rightSidebar.allergens": "Allergens",
    "culinary2.rightSidebar.diets": "Diets",
    "culinary2.rightSidebar.cuisine": "Cuisine",
    "culinary2.rightSidebar.course": "Course / Service",
    "culinary2.rightSidebar.technique": "Technique",
    "culinary2.rightSidebar.difficulty": "Difficulty",
    "culinary2.rightSidebar.chefNotes": "Chef notes",
    "culinary2.rightSidebar.chefNotesPlaceholder": "Notes only you see.",
    "culinary2.rightSidebar.yieldTest": "Yield test",
    "culinary2.rightSidebar.yieldIngredient": "Ingredient",
    "culinary2.rightSidebar.yieldMethod": "Method",
    "culinary2.rightSidebar.inputQty": "Input qty",
    "culinary2.rightSidebar.outputQty": "Output qty",
    "culinary2.rightSidebar.yieldPercent": "Yield %",
    "culinary2.rightSidebar.logYieldTest": "Log test",

    /* Pastry 2 */
    "pastry2.title": "Pastry 2",
    "pastry2.selectSection": "Select a section",
    "pastry2.section.navigation": "NAVIGATION",
    "pastry2.section.training": "TRAINING",
    "pastry2.section.innovation_rnd": "INNOVATION & R&D",
    "pastry2.section.operations": "OPERATIONS",
    "pastry2.section.supply_chain": "SUPPLY CHAIN",
    "pastry2.section.analysis_compliance": "ANALYSIS & COMPLIANCE",
    "pastry2.nav.search": "RECIPES",
    "pastry2.nav.add-recipe": "ADD RECIPE",
    "pastry2.nav.canvas": "CANVAS",
    "pastry2.nav.cake-builder": "CAKE BUILDER",
    "pastry2.nav.menu-studio": "MENU DESIGN STU",
    "pastry2.nav.gallery": "GALLERY",
    "pastry2.nav.dish-assembly": "DISH ASSEMBLY",
    "pastry2.nav.menu-builder": "MENU BUILDER",
    "pastry2.nav.pastry-training": "PASTRY TRAINING",
    "pastry2.nav.techniques": "TECHNIQUES",
    "pastry2.nav.rd-labs": "RD LABS",
    "pastry2.nav.production": "PRODUCTION",
    "pastry2.nav.server-notes": "SERVER NOTES",
    "pastry2.nav.operations-docs": "OPERATIONS DOCS",
    "pastry2.nav.tablet-waste": "TABLET WASTE",
    "pastry2.nav.tablet-transfer": "TABLET TRANSFER",
    "pastry2.nav.purchasing": "PURCH/REC",
    "pastry2.nav.inventory-transfer": "INVENTORY TRANS",
    "pastry2.nav.costing": "COSTING",
    "pastry2.nav.haccp": "HACCP/Compliance",
    "pastry2.nav.waste-tracking": "WASTE TRACKING",
    "pastry2.nav.nutrition": "Nutrition/Allergens",
    "pastry2.recipes.loading": "Loading recipes…",
    "pastry2.addRecipe.loading": "Loading Add Recipe…",
    "pastry2.training.title": "Pastry Training",
    "pastry2.training.subtitle": "Build skills and track progress.",
    "pastry2.training.description": "Use this space for pastry training modules, videos, and checklists. Content can be wired to your curriculum or learning management system.",
    "pastry2.training.bullet1": "Fundamentals: doughs, creams, and bases",
    "pastry2.training.bullet2": "Plated desserts and platter design",
    "pastry2.training.bullet3": "Seasonal and holiday specialties",
    "pastry2.training.bullet4": "Allergen-safe and dietary variations",
    "pastry2.techniques.title": "Techniques",
    "pastry2.techniques.subtitle": "Reference and how-tos.",
    "pastry2.techniques.description": "Quick reference for pastry and baking techniques: tempering chocolate, sugar work, laminating dough, piping, and more.",
    "pastry2.techniques.bullet1": "Chocolate tempering and molding",
    "pastry2.techniques.bullet2": "Caramel and sugar work",
    "pastry2.techniques.bullet3": "Laminated dough (puff, croissant)",
    "pastry2.techniques.bullet4": "Piping and decoration",
    "pastry2.techniques.bullet5": "Meringues and foams",

    /* Settings Panel */
    "settings.title": "Settings",
    "settings.avatar": "Avatar",
    "settings.theme": "Theme",
    "settings.language": "Language",
    "settings.language.select": "Select Language",
    "settings.dashboard-widgets": "Dashboard Widgets",
    "settings.mini-panels": "Mini Panels",
    "settings.custom-widgets": "Custom Widgets",
    "settings.toolbar": "Toolbar",
    "settings.sticky-notes": "Sticky Notes",
    "settings.developer": "Developer",
    "settings.collapse": "Collapse",
    "settings.expand": "Expand",

    /* AI Cooking Assistant */
    "module.ai-cooking-assistant.title": "AI Cooking Assistant",
    "module.ai-cooking-assistant.description":
      "Real-time guidance, problem solving, and recipe innovation",
    "module.ai-cooking-assistant.stats.sessions": "Sessions Guided",
    "module.ai-cooking-assistant.stats.problems": "Problems Solved",
    "module.ai-cooking-assistant.stats.satisfaction": "User Satisfaction",
    "module.ai-cooking-assistant.stats.innovations": "Innovations Offered",
    "module.ai-cooking-assistant.stats.thisWeek": "This week",
    "module.ai-cooking-assistant.stats.wastePrevented": "Prevented waste",
    "module.ai-cooking-assistant.stats.avgRating": "Avg rating",
    "module.ai-cooking-assistant.tabs.guidance": "Live Guidance",
    "module.ai-cooking-assistant.tabs.problems": "Problem Solving",
    "module.ai-cooking-assistant.tabs.innovations": "Innovations",
    "module.ai-cooking-assistant.guidance.currentSession":
      "Current Cooking Session",
    "module.ai-cooking-assistant.guidance.stage": "Stage",
    "module.ai-cooking-assistant.guidance.temperature": "Internal Temperature",
    "module.ai-cooking-assistant.guidance.timeRemaining": "Time Remaining",
    "module.ai-cooking-assistant.guidance.min": "min",
    "module.ai-cooking-assistant.guidance.aiGuidance": "AI Guidance",
    "module.ai-cooking-assistant.guidance.proTips": "Pro Tips",
    "module.ai-cooking-assistant.problems.getHelp":
      "Get Help with Cooking Problems",
    "module.ai-cooking-assistant.problems.placeholder":
      "Describe your cooking issue...",
    "module.ai-cooking-assistant.problems.getHelpButton": "Get Help",
    "module.ai-cooking-assistant.problems.commonSolutions": "Common Solutions",
    "module.ai-cooking-assistant.problems.successRate": "Success rate",
    "module.ai-cooking-assistant.problems.fixTime": "min fix time",
    "module.ai-cooking-assistant.innovations.title": "Recipe Innovations",
    "module.ai-cooking-assistant.innovations.confident": "confident",
    "module.ai-cooking-assistant.innovations.minutes": "minutes",

    /* Auto Scheduling */
    "module.auto-scheduling.title": "Auto Scheduling",
    "module.auto-scheduling.description":
      "AI-generated staff schedules optimized for labor costs and service quality",
    "module.auto-scheduling.generateButton": "Generate Schedule",
    "module.auto-scheduling.generateNew": "Generate New Schedule",

    /* Staff Optimization */
    "module.staff-optimization.title": "Staff Optimization",
    "module.staff-optimization.description":
      "AI analysis for optimal staffing levels and cost savings",
    "module.staff-optimization.analyzeTitle": "Analyze Staffing",
    "module.staff-optimization.analyzing": "Analyzing...",
    "module.staff-optimization.runAnalysis": "Run Analysis",
    "module.staff-optimization.currentStaff": "Current Staff",
    "module.staff-optimization.recommended": "Recommended",
    "module.staff-optimization.estSavings": "Est. Savings",
    "module.staff-optimization.positionBreakdown": "Position Breakdown",
    "module.staff-optimization.risks": "Risks",
    "module.staff-optimization.recommendations": "Recommendations",
    "module.staff-optimization.runNewAnalysis": "Run New Analysis",

    /* Quality Assurance */
    "module.quality-assurance.title": "Quality Assurance",
    "module.quality-assurance.description":
      "Recipe standards, procedures, compliance tracking & audit trails",
    "module.quality-assurance.runAudit": "Run Audit",

    /* Guest Experience */
    "module.guest-experience.title": "Guest Experience",
    "module.guest-experience.description":
      "Reservation management, feedback analysis, preference tracking & loyalty insights",
    "module.guest-experience.analyze": "Analyze",
    "module.guest-experience.tabs.overview": "Overview",
    "module.guest-experience.tabs.reservations": "Reservations",
    "module.guest-experience.tabs.feedback": "Feedback",
    "module.guest-experience.tabs.preferences": "Preferences",
    "module.guest-experience.metrics.totalReservations": "Total Reservations",
    "module.guest-experience.metrics.confirmed": "Confirmed",
    "module.guest-experience.metrics.activeReservations": "Active Reservations",
    "module.guest-experience.metrics.totalFeedback": "Total Feedback",
    "module.guest-experience.metrics.avgRating": "Avg Rating",
    "module.guest-experience.metrics.returnRate": "Return Rate",
    "module.guest-experience.sentiment.positive": "Positive",
    "module.guest-experience.sentiment.neutral": "Neutral",
    "module.guest-experience.sentiment.negative": "Negative",
    "module.guest-experience.charts.satisfactionTrend": "Satisfaction Trend",
    "module.guest-experience.charts.feedbackDistribution":
      "Feedback Distribution",
    "module.guest-experience.charts.guestSentimentSummary":
      "Guest Sentiment Summary",
    "module.guest-experience.upcomingReservations": "Upcoming Reservations",
    "module.guest-experience.next7Days": "Next 7 days schedule",
    "module.guest-experience.recentFeedback": "Recent Guest Feedback",
    "module.guest-experience.preferences": "Guest Preferences & Loyalty",
    "module.guest-experience.willReturn": "Will Return",
    "module.guest-experience.metrics.willReturn": "Will Return",
    "module.guest-experience.metrics.next7Days": "Next 7 Days",
    "module.guest-experience.metrics.knownGuests": "Known Guests",
    "module.guest-experience.metrics.loyaltySpend": "Loyalty Spend",
    "module.guest-experience.metrics.basedOnReviews":
      "Based on {count} reviews",
    "module.guest-experience.insights": "Insights",
    "module.guest-experience.retentionRate": "Retention",
    "module.guest-experience.activeReservations": "Active reservations",
    "module.guest-experience.metrics.retention": "retention",
    "module.guest-experience.metrics.guests": "guests",
    "module.guest-experience.metrics.withSavedPreferences":
      "With saved preferences",
    "module.guest-experience.metrics.lifetimeRevenue": "Lifetime revenue",

    /* Supply Chain */
    "module.supply-chain.title": "Supply Chain",
    "module.supply-chain.description":
      "Supplier management, inventory optimization, procurement analytics & waste tracking",

    /* Voice Commands */
    "module.voice-commands.title": "Voice Commands",
    "module.voice-commands.description":
      "Voice-controlled operations, audio guidance & hands-free workflow",

    /* Unified Canvas */
    "module.unified-canvas.title": "Unified Canvas",
    "module.unified-canvas.description":
      "Team collaboration, shared context & real-time coordination",

    /* Predictive Maintenance */
    "module.predictive-maintenance.title": "Predictive Maintenance",
    "module.predictive-maintenance.description":
      "Equipment health monitoring, failure prediction & proactive maintenance",
    "module.predictive-maintenance.analyzing": "Analyzing...",
    "module.predictive-maintenance.analyze": "Analyze",
    "module.supply-chain.optimize": "Optimize",

    /* Template Marketplace */
    "module.template-marketplace.title": "Template Marketplace",
    "module.template-marketplace.description":
      "Share, discover, and monetize operational templates",
    "module.template-marketplace.createTemplate": "Create Template",
    "module.template-marketplace.tabs.browse": "Browse",
    "module.template-marketplace.tabs.myLibrary": "My Library",
    "module.template-marketplace.tabs.analytics": "Analytics",
    "module.template-marketplace.searchPlaceholder": "Search templates...",
    "module.template-marketplace.sortBy": "Sort by",
    "module.template-marketplace.sort.mostPopular": "Most Popular",
    "module.template-marketplace.sort.topRated": "Top Rated",
    "module.template-marketplace.sort.newest": "Newest",
    "module.template-marketplace.sort.priceLow": "Price: Low to High",
    "module.template-marketplace.sort.priceHigh": "Price: High to Low",
    "module.template-marketplace.difficulty": "Difficulty",
    "module.template-marketplace.difficulty.all": "All Levels",
    "module.template-marketplace.difficulty.beginner": "Beginner",
    "module.template-marketplace.difficulty.intermediate": "Intermediate",
    "module.template-marketplace.difficulty.advanced": "Advanced",
    "module.template-marketplace.categories.menus": "Menus",
    "module.template-marketplace.categories.recipes": "Recipes",
    "module.template-marketplace.categories.workflows": "Workflows",
    "module.template-marketplace.categories.schedules": "Schedules",
    "module.template-marketplace.categories.events": "Events",
    "module.template-marketplace.categories.training": "Training",
    "module.template-marketplace.download": "Download",
    "module.template-marketplace.favorite": "Favorite",
    "module.template-marketplace.analytics.totalTemplates": "Total Templates",
    "module.template-marketplace.analytics.activeUsers": "Active Users",
    "module.template-marketplace.analytics.totalDownloads": "Total Downloads",
    "module.template-marketplace.analytics.avgRating": "Avg Rating",
    "module.template-marketplace.analytics.categoryDistribution":
      "Category Distribution",
    "module.template-marketplace.analytics.topTemplates": "Top Templates",
    "module.template-marketplace.noFavorites": "No favorites yet",
    "module.template-marketplace.heartTemplates":
      "Heart templates to save them to your library",

    /* Supplier Network */
    "module.supplier-network.title": "Supplier Network",
    "module.supplier-network.description":
      "Bulk buying power & talent network exchange",
    "module.supplier-network.networkSettings": "Network Settings",
    "module.supplier-network.tabs.suppliers": "Suppliers",
    "module.supplier-network.tabs.talent": "Talent",
    "module.supplier-network.metrics.totalSavings": "Total Savings",
    "module.supplier-network.metrics.thisYear": "This year",
    "module.supplier-network.metrics.networkSuppliers": "Network Suppliers",
    "module.supplier-network.metrics.activePartners": "Active partners",
    "module.supplier-network.metrics.talentPool": "Talent Pool",
    "module.supplier-network.metrics.availableMembers": "Available members",
    "module.supplier-network.metrics.avgDelivery": "Avg Delivery",
    "module.supplier-network.metrics.days": "Days",
    "module.supplier-network.searchPlaceholder":
      "Search suppliers or talent...",
    "module.supplier-network.categories.produce": "Produce",
    "module.supplier-network.categories.meat": "Meat",
    "module.supplier-network.categories.dairy": "Dairy",
    "module.supplier-network.categories.pantry": "Pantry",
    "module.supplier-network.categories.beverages": "Beverages",
    "module.supplier-network.categories.specialty": "Specialty",
    "module.supplier-network.roles.chef": "Chef",
    "module.supplier-network.roles.baker": "Baker",
    "module.supplier-network.roles.bartender": "Bartender",
    "module.supplier-network.roles.server": "Server",
    "module.supplier-network.roles.manager": "Manager",
    "module.supplier-network.roles.specialist": "Specialist",

    /* Data Collective */
    "module.data-collective.title": "Industry Benchmarking",
    "module.data-collective.description":
      "Compare performance and stay ahead of market trends",
    "module.data-collective.export": "Export",
    "module.data-collective.settings": "Settings",
    "module.data-collective.tabs.benchmarks": "Benchmarks",
    "module.data-collective.tabs.insights": "Insights",
    "module.data-collective.tabs.competitors": "Competitors",
    "module.data-collective.tabs.alerts": "Alerts",
    "module.data-collective.metrics.overallPercentile": "Overall Percentile",
    "module.data-collective.metrics.vsIndustry": "vs industry average",
    "module.data-collective.metrics.exceeding": "Exceeding",
    "module.data-collective.metrics.ofMetrics": "of 6 metrics",
    "module.data-collective.metrics.benchmarkTrend": "Benchmark Trend",
    "module.data-collective.metrics.monthImprovement": "6-month improvement",
    "module.data-collective.metrics.gapToTop": "Gap to Top",
    "module.data-collective.metrics.percentagePoints": "percentage points",
    "module.data-collective.charts.performanceRadar": "Performance Radar",
    "module.data-collective.charts.monthTrend": "6-Month Trend",
    "module.data-collective.charts.you": "You",
    "module.data-collective.charts.industryAvg": "Industry Avg",
    "module.data-collective.charts.topPerformer": "Top Performer",

    /* PTO Management */
    "module.pto-management.title": "PTO Management",
    "module.pto-management.description":
      "Approval workflow & coverage planning",

    /* Custom Analytics */
    "module.custom-analytics.title": "Custom Analytics",
    "module.custom-analytics.description":
      "Real-time executive dashboard with custom metrics",
    "module.custom-analytics.autoRefresh": "Auto Refresh",

    /* Multi-Property */
    "module.multi-property.title": "Multi-Property Management",
    "module.multi-property.description":
      "Cross-location analytics & consolidated reporting",

    /* Mobile Enhancements */
    "module.mobile-enhancements.title": "Mobile Enhancements",
    "module.mobile-enhancements.description":
      "Offline capabilities & push notifications",

    /* Global Calendar */
    "module.global-calendar.title": "Global Calendar",
    "module.global-calendar.view": "View",

    /* CRM */
    "module.crm.title": "Customer Relations",
    "module.crm.description": "Manage customer relationships and sales",
    "module.crm.newCustomer": "New Customer",
    "module.crm.welcome": "Welcome to CRM",
    "module.crm.gettingStarted": "Start managing your customer relationships",

    /* Engine Modules */
    "module.culinary-engine.title": "Culinary Engine",
    "module.culinary-engine.description":
      "Production Planning • Yield Calculations • Allergen Tracking",
    "module.inventory-engine.title": "Inventory Engine",
    "module.inventory-engine.description":
      "Stock Tracking • Shortage Detection • Procurement Intelligence",
    "module.labor-engine.title": "Labor Engine",
    "module.labor-engine.description": "Staff scheduling & task management",
    "module.engineering-engine.title": "Engineering/AV Engine",
    "module.engineering-engine.description":
      "HVAC, AV systems & facilities management",
    "module.financials-engine.title": "Financials Engine",
    "module.financials-engine.description":
      "Revenue projections & margin analysis",

    /* Maestro Dashboard */
    "module.maestro-dashboard.title": "Maestro Dashboard",
    "module.maestro-dashboard.loginPrompt":
      "Please log in to access the dashboard",

    /* HR Payroll */
    "module.hr-payroll.title": "HR & Payroll Management",
    "module.hr-payroll.description": "Employees, scheduling, payroll",

    /* Echo Canva Modules */
    "module.cake-order.title": "Cake Order & Builder",
    "module.cake-order.studio": "Design Studio",
    "module.cake-order.placeOrder": "Place Order",
    "module.design-editor.title": "Design Editor",

    /* Purchasing */
    "module.purchasing.title": "Purchasing & Receiving",
    "module.purchasing.description": "Operations management",
  },
  es: {
    /* Navigation */
    "nav.home": "Inicio",
    "nav.dashboard": "Panel",
    "nav.culinary": "Culinario",
    "nav.pastry": "Pastelería",
    "nav.schedule": "Horario",
    "nav.inventory": "Inventario",
    "nav.maestro": "Maestro BQT",
    "nav.mixology_sommelier": "Mixología y Sommelier",
    "nav.chefnet": "ChefNet",
    "nav.support": "Soporte",
    "nav.whiteboard": "Pizarra",
    "nav.video": "Videoconferencia",
    "nav.canvas": "Estudio Canvas",
    "nav.notes": "Notas",

    /* Toolbar */
    "toolbar.theme": "Tema",
    "toolbar.light": "Claro",
    "toolbar.dark": "Oscuro",
    "toolbar.colors": "Esquema de color",
    "toolbar.language": "Idioma",
    "toolbar.cyan": "Cian",
    "toolbar.blue": "Azul",
    "toolbar.emerald": "Esmeralda",
    "toolbar.violet": "Violeta",
    "toolbar.rose": "Rosa",

    /* Common Actions */
    "action.close": "Cerrar",
    "action.minimize": "Minimizar",
    "action.maximize": "Maximizar",
    "action.popout": "Abrir",
    "action.pin": "Fijar",
    "action.save": "Guardar",
    "action.cancel": "Cancelar",
    "action.delete": "Eliminar",
    "action.edit": "Editar",
    "action.add": "Añadir",
    "action.search": "Buscar",

    /* Module Titles */
    "module.dashboard": "Panel de Control",
    "module.culinary": "EchoRecipePro",
    "module.pastry": "Diseñador de Pasteles",
    "module.schedule": "Cronograma de Producción",
    "module.inventory": "Gestión de Inventario",
    "module.maestro": "Gestión de Cocina",
    "module.mixology_sommelier": "Mixología y Sommelier",
    "module.chefnet": "Colaboración de Equipo",
    "module.support": "Ayuda",
    "module.whiteboard": "Pizarra",
    "module.video": "Videoconferencia",
    "module.canvas": "Estudio Canvas",
    "module.notes": "Notas",

    /* Panel Titles */
    "panel.dashboard": "Panel de Control",
    "panel.culinary": "Culinario",
    "panel.culinary_sidebar": "Propiedades de Receta",
    "panel.pastry": "Pastelería",
    "panel.schedule": "Cronograma",
    "panel.inventory": "Inventario",
    "panel.maestro": "Maestro BQT",
    "panel.maestro_sidebar": "Monitor BQT",
    "panel.mixology_sommelier": "Mixología y Sommelier",
    "panel.chefnet": "ChefNet",
    "panel.support": "Soporte",
    "panel.whiteboard": "Pizarra",
    "panel.video": "Videoconferencia",
    "panel.studio": "Estudio Canvas",
    "panel.notes": "Notas Adhesivas",
    "panel.purchasing": "Compras y Recepción",
    "panel.aurum": "EchoAurum",
    "panel.layout": "EchoLayout",
    "panel.events": "EchoEventos",
    "panel.stratus": "EchoStratus",
    "panel.demand": "Pronóstico de Demanda",
    "panel.pricing": "Precios Dinámicos",
    "panel.staffing": "Optimización de Personal",
    "panel.scheduling": "Programación Automática",
    "panel.revenue": "Operaciones de Ingresos",
    "panel.costs": "Gestión de Costos",
    "panel.qa": "Aseguramiento de Calidad",
    "panel.guest": "Experiencia del Huésped",
    "panel.supply": "Cadena de Suministro",
    "panel.voice": "Comandos de Voz",
    "panel.canvas": "Lienzo Unificado",
    "panel.ai-chef": "Asistente de Cocina IA",
    "panel.maintenance": "Mantenimiento Predictivo",
    "panel.templates": "Mercado de Plantillas",
    "panel.network": "Red de Proveedores",
    "panel.benchmark": "Colectivo de Datos",
    "panel.zaro": "Guardián ZARO",
    "panel.settings": "Configuración",
    "panel.echo": "EchoCoder",
    "panel.network-chat": "Chat de Red",
    "panel.chat-settings": "Configuración de Chat",

    /* Settings Panel */
    "settings.title": "Configuración",

    /* Sidebar Groups */
    "sidebar.coreOperations": "Operaciones Principales",
    "sidebar.financialSupply": "Finanzas y Cadena de Suministro",
    "sidebar.designAnalytics": "Diseño y Analítica",
    "sidebar.communitySupport": "Comunidad y Soporte",
    "sidebar.maestroBQT": "Maestro BQT",
    "sidebar.orderingInventory": "Pedidos e Inventario",
    "sidebar.purchasingReceiving": "Compras y Recepción",
    "sidebar.mixologySommelier": "Mixología y Sommelier",
    "sidebar.echoAurum": "EchoAurum",
    "sidebar.echoStratus": "EchoStratus",
    "sidebar.echoEvents": "Echo Eventos",
    "sidebar.echoLayout": "EchoLayout",

    "settings.avatar": "Avatar",
    "settings.theme": "Tema",
    "settings.language": "Idioma",
    "settings.language.select": "Seleccionar Idioma",
    "settings.dashboard-widgets": "Widgets del Panel",
    "settings.mini-panels": "Paneles Mini",
    "settings.custom-widgets": "Widgets Personalizados",
    "settings.toolbar": "Barra de Herramientas",
    "settings.sticky-notes": "Notas Adhesivas",
    "settings.developer": "Desarrollador",
    "settings.collapse": "Contraer",
    "settings.expand": "Expandir",
  },
  fr: {
    /* Navigation */
    "nav.home": "Accueil",
    "nav.dashboard": "Tableau de bord",
    "nav.culinary": "Culinaire",
    "nav.pastry": "Pâtisserie",
    "nav.schedule": "Calendrier",
    "nav.inventory": "Inventaire",
    "nav.maestro": "Maestro BQT",
    "nav.mixology_sommelier": "Mixologie et Sommelier",
    "nav.chefnet": "ChefNet",
    "nav.support": "Support",
    "nav.whiteboard": "Tableau blanc",
    "nav.video": "Vidéoconférence",
    "nav.canvas": "Studio Canvas",
    "nav.notes": "Notes",

    /* Toolbar */
    "toolbar.theme": "Thème",
    "toolbar.light": "Clair",
    "toolbar.dark": "Sombre",
    "toolbar.colors": "Schéma de couleur",
    "toolbar.language": "Langue",
    "toolbar.cyan": "Cyan",
    "toolbar.blue": "Bleu",
    "toolbar.emerald": "Émeraude",
    "toolbar.violet": "Violet",
    "toolbar.rose": "Rose",

    /* Common Actions */
    "action.close": "Fermer",
    "action.minimize": "Réduire",
    "action.maximize": "Agrandir",
    "action.popout": "Ouvrir",
    "action.pin": "Épingler",
    "action.save": "Enregistrer",
    "action.cancel": "Annuler",
    "action.delete": "Supprimer",
    "action.edit": "Modifier",
    "action.add": "Ajouter",
    "action.search": "Chercher",

    /* Module Titles */
    "module.dashboard": "Tableau de bord",
    "module.culinary": "EchoRecipePro",
    "module.pastry": "Constructeur de Gâteau",
    "module.schedule": "Calendrier de Production",
    "module.inventory": "Gestion des Stocks",
    "module.maestro": "Gestion de Cuisine",
    "module.mixology_sommelier": "Mixologie et Sommelier",
    "module.chefnet": "Collaboration d'Équipe",
    "module.support": "Aide",
    "module.whiteboard": "Tableau blanc",
    "module.video": "Vidéoconférence",
    "module.canvas": "Studio Canvas",
    "module.notes": "Notes",

    /* Panel Titles */
    "panel.dashboard": "Tableau de bord",
    "panel.culinary": "Culinaire",
    "panel.culinary_sidebar": "Propriétés de la Recette",
    "panel.pastry": "Pâtisserie",
    "panel.schedule": "Calendrier",
    "panel.inventory": "Inventaire",
    "panel.maestro": "Maestro BQT",
    "panel.maestro_sidebar": "Moniteur BQT",
    "panel.mixology_sommelier": "Mixologie et Sommelier",
    "panel.chefnet": "ChefNet",
    "panel.support": "Support",
    "panel.whiteboard": "Tableau blanc",
    "panel.video": "Vidéoconférence",
    "panel.studio": "Studio Canvas",
    "panel.notes": "Notes Adhésives",
    "panel.purchasing": "Achats et Réception",
    "panel.aurum": "EchoAurum",
    "panel.layout": "EchoLayout",
    "panel.events": "EchoEvenements",
    "panel.stratus": "EchoStratus",
    "panel.demand": "Prévision de la Demande",
    "panel.pricing": "Tarification Dynamique",
    "panel.staffing": "Optimisation du Personnel",
    "panel.scheduling": "Programmation Automatique",
    "panel.revenue": "Opérations de Revenus",
    "panel.costs": "Gestion des Coûts",
    "panel.qa": "Assurance Qualité",
    "panel.guest": "Expérience Client",
    "panel.supply": "Chaîne d'Approvisionnement",
    "panel.voice": "Commandes Vocales",
    "panel.canvas": "Toile Unifiée",
    "panel.ai-chef": "Assistant Culinaire IA",
    "panel.maintenance": "Maintenance Prédictive",
    "panel.templates": "Marché des Modèles",
    "panel.network": "Réseau des Fournisseurs",
    "panel.benchmark": "Collectif de Données",
    "panel.zaro": "Gardien ZARO",
    "panel.settings": "Paramètres",
    "panel.echo": "EchoCoder",
    "panel.network-chat": "Chat Réseau",
    "panel.chat-settings": "Paramètres du Chat",

    /* Settings Panel */
    "settings.title": "Paramètres",

    /* Sidebar Groups */
    "sidebar.coreOperations": "Opérations Principales",
    "sidebar.financialSupply": "Finance et Approvisionnement",
    "sidebar.designAnalytics": "Design et Analytique",
    "sidebar.communitySupport": "Communauté et Support",
    "sidebar.maestroBQT": "Maestro BQT",
    "sidebar.orderingInventory": "Commandes et Inventaire",
    "sidebar.purchasingReceiving": "Achats et Réception",
    "sidebar.mixologySommelier": "Mixologie et Sommelier",
    "sidebar.echoAurum": "EchoAurum",
    "sidebar.echoStratus": "EchoStratus",
    "sidebar.echoEvents": "Echo Événements",
    "sidebar.echoLayout": "EchoLayout",

    "settings.avatar": "Avatar",
    "settings.theme": "Thème",
    "settings.language": "Langue",
    "settings.language.select": "Sélectionner la Langue",
    "settings.dashboard-widgets": "Widgets du Tableau de Bord",
    "settings.mini-panels": "Mini Panneaux",
    "settings.custom-widgets": "Widgets Personnalisés",
    "settings.toolbar": "Barre d'Outils",
    "settings.sticky-notes": "Notes Adhésives",
    "settings.developer": "Développeur",
    "settings.collapse": "Réduire",
    "settings.expand": "Développer",
  },
  de: {
    /* Navigation */
    "nav.home": "Startseite",
    "nav.dashboard": "Dashboard",
    "nav.culinary": "Kulinarik",
    "nav.pastry": "Gebäck",
    "nav.schedule": "Zeitplan",
    "nav.inventory": "Bestand",
    "nav.maestro": "Maestro BQT",
    "nav.mixology_sommelier": "Mixologie und Sommelier",
    "nav.chefnet": "ChefNet",
    "nav.support": "Unterstützung",
    "nav.whiteboard": "Whiteboard",
    "nav.video": "Videokonferenz",
    "nav.canvas": "Canvas Studio",
    "nav.notes": "Notizen",

    /* Toolbar */
    "toolbar.theme": "Design",
    "toolbar.light": "Hell",
    "toolbar.dark": "Dunkel",
    "toolbar.colors": "Farbschema",
    "toolbar.language": "Sprache",
    "toolbar.cyan": "Cyan",
    "toolbar.blue": "Blau",
    "toolbar.emerald": "Smaragd",
    "toolbar.violet": "Violett",
    "toolbar.rose": "Rose",

    /* Common Actions */
    "action.close": "Schließen",
    "action.minimize": "Minimieren",
    "action.maximize": "Maximieren",
    "action.popout": "Öffnen",
    "action.pin": "Anheften",
    "action.save": "Speichern",
    "action.cancel": "Abbrechen",
    "action.delete": "Löschen",
    "action.edit": "Bearbeiten",
    "action.add": "Hinzufügen",
    "action.search": "Suchen",

    /* Module Titles */
    "module.dashboard": "Dashboard",
    "module.culinary": "EchoRecipePro",
    "module.pastry": "Kuchendesigner",
    "module.schedule": "Produktionsplan",
    "module.inventory": "Bestandsverwaltung",
    "module.maestro": "Küchenverwaltung",
    "module.mixology_sommelier": "Mixologie und Sommelier",
    "module.chefnet": "Teamzusammenarbeit",
    "module.support": "Hilfe",
    "module.whiteboard": "Whiteboard",
    "module.video": "Videokonferenz",
    "module.canvas": "Canvas Studio",
    "module.notes": "Notizen",

    /* Panel Titles */
    "panel.dashboard": "Dashboard",
    "panel.culinary": "Kulinarik",
    "panel.culinary_sidebar": "Rezept-Eigenschaften",
    "panel.pastry": "Gebäck",
    "panel.schedule": "Zeitplan",
    "panel.inventory": "Bestand",
    "panel.maestro": "Maestro BQT",
    "panel.maestro_sidebar": "BQT-Monitor",
    "panel.mixology_sommelier": "Mixologie und Sommelier",
    "panel.chefnet": "ChefNet",
    "panel.support": "Unterstützung",
    "panel.whiteboard": "Whiteboard",
    "panel.video": "Videokonferenz",
    "panel.studio": "Canvas Studio",
    "panel.notes": "Notizzettel",
    "panel.purchasing": "Einkauf und Wareneingang",
    "panel.aurum": "EchoAurum",
    "panel.layout": "EchoLayout",
    "panel.events": "EchoEvents",
    "panel.stratus": "EchoStratus",
    "panel.demand": "Nachfrageprognose",
    "panel.pricing": "Dynamische Preisgestaltung",
    "panel.staffing": "Personaloptimierung",
    "panel.scheduling": "Automatische Planung",
    "panel.revenue": "Umsatzbetrieb",
    "panel.costs": "Kostenverwaltung",
    "panel.qa": "Qualitätssicherung",
    "panel.guest": "Gastertlebnis",
    "panel.supply": "Lieferkette",
    "panel.voice": "Sprachbefehle",
    "panel.canvas": "Einheitliche Leinwand",
    "panel.ai-chef": "KI-Kochasistent",
    "panel.maintenance": "Vorausschauende Wartung",
    "panel.templates": "Template-Marktplatz",
    "panel.network": "Lieferantennetzwerk",
    "panel.benchmark": "Datenkollegium",
    "panel.zaro": "ZARO Wächter",
    "panel.settings": "Einstellungen",
    "panel.echo": "EchoCoder",
    "panel.network-chat": "Netzwerk-Chat",
    "panel.chat-settings": "Chat-Einstellungen",

    /* Settings Panel */
    "settings.title": "Einstellungen",

    /* Sidebar Groups */
    "sidebar.coreOperations": "Kernbetrieb",
    "sidebar.financialSupply": "Finanzen und Lieferkette",
    "sidebar.designAnalytics": "Design und Analytik",
    "sidebar.communitySupport": "Community und Support",
    "sidebar.maestroBQT": "Maestro BQT",
    "sidebar.orderingInventory": "Bestellungen und Inventar",
    "sidebar.purchasingReceiving": "Einkauf und Empfang",
    "sidebar.mixologySommelier": "Mixologie und Sommelier",
    "sidebar.echoAurum": "EchoAurum",
    "sidebar.echoStratus": "EchoStratus",
    "sidebar.echoEvents": "Echo Veranstaltungen",
    "sidebar.echoLayout": "EchoLayout",

    "settings.avatar": "Avatar",
    "settings.theme": "Design",
    "settings.language": "Sprache",
    "settings.language.select": "Sprache auswählen",
    "settings.dashboard-widgets": "Dashboard-Widgets",
    "settings.mini-panels": "Mini-Panels",
    "settings.custom-widgets": "Benutzerdefinierte Widgets",
    "settings.toolbar": "Werkzeugleiste",
    "settings.sticky-notes": "Notizzettel",
    "settings.developer": "Entwickler",
    "settings.collapse": "Einklappen",
    "settings.expand": "Ausklappen",
  },
  ja: {
    /* Navigation */
    "nav.home": "ホーム",
    "nav.dashboard": "ダッシュボード",
    "nav.culinary": "調理",
    "nav.pastry": "製菓",
    "nav.schedule": "スケジュール",
    "nav.inventory": "在庫",
    "nav.maestro": "マ��ストロ BQT",
    "nav.mixology_sommelier": "ミクソロジーとソムリエ",
    "nav.chefnet": "シェフネット",
    "nav.support": "サポート",
    "nav.whiteboard": "ホワイトボード",
    "nav.video": "ビデオ会議",
    "nav.canvas": "キャンバススタジオ",
    "nav.notes": "付箋",

    /* Toolbar */
    "toolbar.theme": "テーマ",
    "toolbar.light": "ライト",
    "toolbar.dark": "ダーク",
    "toolbar.colors": "カラースキーム",
    "toolbar.language": "言語",
    "toolbar.cyan": "シアン",
    "toolbar.blue": "ブルー",
    "toolbar.emerald": "エメラルド",
    "toolbar.violet": "バイオレット",
    "toolbar.rose": "ローズ",

    /* Common Actions */
    "action.close": "閉じる",
    "action.minimize": "最小化",
    "action.maximize": "最大化",
    "action.popout": "ポップアウト",
    "action.pin": "ピン留め",
    "action.save": "保存",
    "action.cancel": "キャンセル",
    "action.delete": "削除",
    "action.edit": "編集",
    "action.add": "追加",
    "action.search": "検索",

    /* Module Titles */
    "module.dashboard": "ダッシュボード",
    "module.culinary": "エコーレシピプロ",
    "module.pastry": "ケーキビルダー",
    "module.schedule": "生産スケジュール",
    "module.inventory": "在庫管理",
    "module.maestro": "キッチン管理",
    "module.mixology_sommelier": "ミクソロジーとソムリエ",
    "module.chefnet": "チーム協力",
    "module.support": "サポート",
    "module.whiteboard": "ホワイトボード",
    "module.video": "ビデオ会議",
    "module.canvas": "キャンバススタジオ",
    "module.notes": "付箋",

    /* Panel Titles */
    "panel.dashboard": "ダッシュボード",
    "panel.culinary": "調理",
    "panel.culinary_sidebar": "レシ���プロパティ",
    "panel.pastry": "製菓",
    "panel.schedule": "スケジュール",
    "panel.inventory": "在庫",
    "panel.maestro": "マエストロ BQT",
    "panel.maestro_sidebar": "BQT モニター",
    "panel.mixology_sommelier": "ミクソロジーとソムリエ",
    "panel.chefnet": "シェフネット",
    "panel.support": "サポート",
    "panel.whiteboard": "ホワイトボード",
    "panel.video": "ビデオ会議",
    "panel.studio": "キャンバススタジオ",
    "panel.notes": "付箋",
    "panel.purchasing": "購買と受け取り",
    "panel.aurum": "エコーアウルム",
    "panel.layout": "エコーレイアウト",
    "panel.stratus": "エコーストラタス",
    "panel.demand": "需要予測",
    "panel.pricing": "動的価格設定",
    "panel.staffing": "スタッフ最適化",
    "panel.scheduling": "自動スケジューリング",
    "panel.revenue": "収益運用",
    "panel.costs": "コスト管理",
    "panel.qa": "品質保証",
    "panel.guest": "ゲスト体験",
    "panel.supply": "サプライチェーン",
    "panel.voice": "音声コマンド",
    "panel.canvas": "統一キャンバス",
    "panel.ai-chef": "AI料理アシスタント",
    "panel.maintenance": "予測メンテナンス",
    "panel.templates": "テンプレートマーケットプレイス",
    "panel.network": "サプライヤーネットワーク",
    "panel.benchmark": "データコレクティブ",
    "panel.zaro": "ZARO ガーディアン",
    "panel.settings": "設定",
    "panel.echo": "エコーコーダー",
    "panel.network-chat": "ネットワークチャット",
    "panel.chat-settings": "チャット設定",

    /* Settings Panel */
    "settings.title": "設定",

    /* Sidebar Groups */
    "sidebar.coreOperations": "主要業務",
    "sidebar.financialSupply": "財務とサプライチェーン",
    "sidebar.designAnalytics": "デザインと分析",
    "sidebar.communitySupport": "コミュニティとサポート",
    "sidebar.maestroBQT": "Maestro BQT",
    "sidebar.orderingInventory": "注文と在庫管理",
    "sidebar.purchasingReceiving": "購買と入荷",
    "sidebar.mixologySommelier": "ミクソロジーとソムリエ",
    "sidebar.echoAurum": "EchoAurum",
    "sidebar.echoStratus": "EchoStratus",
    "sidebar.echoEvents": "Echoイベント",
    "sidebar.echoLayout": "EchoLayout",

    "settings.avatar": "アバター",
    "settings.theme": "テーマ",
    "settings.language": "言語",
    "settings.language.select": "言語を選択",
    "settings.dashboard-widgets": "ダッシュボードウィジェット",
    "settings.mini-panels": "ミニパネル",
    "settings.custom-widgets": "カスタムウィジェット",
    "settings.toolbar": "ツールバー",
    "settings.sticky-notes": "付箋",
    "settings.developer": "開発者",
    "settings.collapse": "折りたたむ",
    "settings.expand": "展開",
  },
  pt: {
    /* Navigation */
    "nav.home": "Início",
    "nav.dashboard": "Painel",
    "nav.culinary": "Culinária",
    "nav.pastry": "Confeitaria",
    "nav.schedule": "Agenda",
    "nav.inventory": "Estoque",
    "nav.maestro": "Maestro BQT",
    "nav.mixology_sommelier": "Mixologia e Sommelier",
    "nav.chefnet": "ChefNet",
    "nav.support": "Suporte",
    "nav.whiteboard": "Quadro Branco",
    "nav.video": "Videoconferência",
    "nav.canvas": "Canvas Studio",
    "nav.notes": "Notas",

    /* Toolbar */
    "toolbar.theme": "Tema",
    "toolbar.light": "Claro",
    "toolbar.dark": "Escuro",
    "toolbar.colors": "Esquema de Cores",
    "toolbar.language": "Idioma",
    "toolbar.cyan": "Ciano",
    "toolbar.blue": "Azul",
    "toolbar.emerald": "Esmeralda",
    "toolbar.violet": "Violeta",
    "toolbar.rose": "Rosa",

    /* Common Actions */
    "action.close": "Fechar",
    "action.minimize": "Minimizar",
    "action.maximize": "Maximizar",
    "action.popout": "Abrir",
    "action.pin": "Fixar",
    "action.save": "Salvar",
    "action.cancel": "Cancelar",
    "action.delete": "Excluir",
    "action.edit": "Editar",
    "action.add": "Adicionar",
    "action.search": "Buscar",

    /* Module Titles */
    "module.dashboard": "Painel de Controle",
    "module.culinary": "EchoRecipePro",
    "module.pastry": "Construtor de Bolos",
    "module.schedule": "Cronograma de Produção",
    "module.inventory": "Gestão de Estoque",
    "module.maestro": "Gestão de Cozinha",
    "module.mixology_sommelier": "Mixologia e Sommelier",
    "module.chefnet": "Colaboração em Equipe",
    "module.support": "Ajuda",
    "module.whiteboard": "Quadro Branco",
    "module.video": "Videoconferência",
    "module.canvas": "Canvas Studio",
    "module.notes": "Notas",

    /* Panel Titles */
    "panel.dashboard": "Painel de Controle",
    "panel.culinary": "Culinária",
    "panel.culinary_sidebar": "Propriedades da Receita",
    "panel.pastry": "Confeitaria",
    "panel.schedule": "Agenda",
    "panel.inventory": "Estoque",
    "panel.maestro": "Maestro BQT",
    "panel.maestro_sidebar": "Monitor BQT",
    "panel.mixology_sommelier": "Mixologia e Sommelier",
    "panel.chefnet": "ChefNet",
    "panel.support": "Suporte",
    "panel.whiteboard": "Quadro Branco",
    "panel.video": "Videoconferência",
    "panel.studio": "Canvas Studio",
    "panel.notes": "Notas Adesivas",
    "panel.purchasing": "Compras e Recebimento",
    "panel.aurum": "EchoAurum",
    "panel.layout": "EchoLayout",
    "panel.events": "EchoEventos",
    "panel.stratus": "EchoStratus",
    "panel.demand": "Previsão de Demanda",
    "panel.pricing": "Precificação Dinâmica",
    "panel.staffing": "Otimização de Pessoal",
    "panel.scheduling": "Agendamento Automático",
    "panel.revenue": "Operações de Receita",
    "panel.costs": "Gestão de Custos",
    "panel.qa": "Garantia de Qualidade",
    "panel.guest": "Experiência do Hóspede",
    "panel.supply": "Cadeia de Suprimentos",
    "panel.voice": "Comandos de Voz",
    "panel.canvas": "Tela Unificada",
    "panel.ai-chef": "Assistente de Cozinha IA",
    "panel.maintenance": "Manutenção Preditiva",
    "panel.templates": "Marketplace de Modelos",
    "panel.network": "Rede de Fornecedores",
    "panel.benchmark": "Coletivo de Dados",
    "panel.zaro": "Guardião ZARO",
    "panel.settings": "Configurações",
    "panel.echo": "EchoCoder",
    "panel.network-chat": "Chat de Rede",
    "panel.chat-settings": "Configurações de Chat",

    /* Settings Panel */
    "settings.title": "Configurações",

    /* Sidebar Groups */
    "sidebar.coreOperations": "Operações Principais",
    "sidebar.financialSupply": "Finanças e Cadeia de Suprimentos",
    "sidebar.designAnalytics": "Design e Análise",
    "sidebar.communitySupport": "Comunidade e Suporte",
    "sidebar.maestroBQT": "Maestro BQT",
    "sidebar.orderingInventory": "Pedidos e Estoque",
    "sidebar.purchasingReceiving": "Compras e Recebimento",
    "sidebar.mixologySommelier": "Mixologia e Sommelier",
    "sidebar.echoAurum": "EchoAurum",
    "sidebar.echoStratus": "EchoStratus",
    "sidebar.echoEvents": "Echo Eventos",
    "sidebar.echoLayout": "EchoLayout",

    "settings.avatar": "Avatar",
    "settings.theme": "Tema",
    "settings.language": "Idioma",
    "settings.language.select": "Selecionar Idioma",
    "settings.dashboard-widgets": "Widgets do Painel",
    "settings.mini-panels": "Mini Painéis",
    "settings.custom-widgets": "Widgets Personalizados",
    "settings.toolbar": "Barra de Ferramentas",
    "settings.sticky-notes": "Notas Adesivas",
    "settings.developer": "Desenvolvedor",
    "settings.collapse": "Recolher",
    "settings.expand": "Expandir",

    /* AI Cooking Assistant */
    "module.ai-cooking-assistant.title": "Assistente de Cozinha IA",
    "module.ai-cooking-assistant.description":
      "Orientação em tempo real, resolução de problemas e inovação de receitas",
    "module.ai-cooking-assistant.stats.sessions": "Sessões Orientadas",
    "module.ai-cooking-assistant.stats.problems": "Problemas Resolvidos",
    "module.ai-cooking-assistant.stats.satisfaction": "Satisfação do Usuário",
    "module.ai-cooking-assistant.stats.innovations": "Inovações Oferecidas",
    "module.ai-cooking-assistant.stats.thisWeek": "Esta semana",
    "module.ai-cooking-assistant.stats.wastePrevented": "Desperdício evitado",
    "module.ai-cooking-assistant.stats.avgRating": "Avaliação média",
    "module.ai-cooking-assistant.tabs.guidance": "Orientação ao Vivo",
    "module.ai-cooking-assistant.tabs.problems": "Resolução de Problemas",
    "module.ai-cooking-assistant.tabs.innovations": "Inovações",
    "module.ai-cooking-assistant.guidance.currentSession":
      "Sessão de Cozinha Atual",
    "module.ai-cooking-assistant.guidance.stage": "Estágio",
    "module.ai-cooking-assistant.guidance.temperature": "Temperatura Interna",
    "module.ai-cooking-assistant.guidance.timeRemaining": "Tempo Restante",
    "module.ai-cooking-assistant.guidance.min": "min",
    "module.ai-cooking-assistant.guidance.aiGuidance": "Orientação da IA",
    "module.ai-cooking-assistant.guidance.proTips": "Dicas Profissionais",
    "module.ai-cooking-assistant.problems.getHelp":
      "Obtenha Ajuda com Problemas de Cozinha",
    "module.ai-cooking-assistant.problems.placeholder":
      "Descreva seu problema de cozinha...",
    "module.ai-cooking-assistant.problems.getHelpButton": "Obter Ajuda",
    "module.ai-cooking-assistant.problems.commonSolutions": "Soluções Comuns",
    "module.ai-cooking-assistant.problems.successRate": "Taxa de sucesso",
    "module.ai-cooking-assistant.problems.fixTime": "min tempo de correção",
    "module.ai-cooking-assistant.innovations.title": "Inovações de Receitas",
    "module.ai-cooking-assistant.innovations.confident": "confiante",
    "module.ai-cooking-assistant.innovations.minutes": "minutos",

    /* Auto Scheduling */
    "module.auto-scheduling.title": "Agendamento Automático",
    "module.auto-scheduling.description":
      "Agendas de equipe geradas por IA otimizadas para custos de mão de obra e qualidade do serviço",
    "module.auto-scheduling.generateButton": "Gerar Agenda",
    "module.auto-scheduling.generateNew": "Gerar Nova Agenda",

    /* Staff Optimization */
    "module.staff-optimization.title": "Otimização de Pessoal",
    "module.staff-optimization.description":
      "Análise de IA para níveis ideais de pessoal e economia de custos",
    "module.staff-optimization.analyzeTitle": "Analisar Pessoal",
    "module.staff-optimization.analyzing": "Analisando...",
    "module.staff-optimization.runAnalysis": "Executar Análise",
    "module.staff-optimization.currentStaff": "Pessoal Atual",
    "module.staff-optimization.recommended": "Recomendado",
    "module.staff-optimization.estSavings": "Economia Est.",
    "module.staff-optimization.positionBreakdown": "Detalhamento por Cargo",
    "module.staff-optimization.risks": "Riscos",
    "module.staff-optimization.recommendations": "Recomendações",
    "module.staff-optimization.runNewAnalysis": "Executar Nova Análise",

    /* Quality Assurance */
    "module.quality-assurance.title": "Garantia de Qualidade",
    "module.quality-assurance.description":
      "Padrões de receitas, procedimentos, rastreamento de conformidade e trilhas de auditoria",
    "module.quality-assurance.runAudit": "Executar Auditoria",

    /* Guest Experience */
    "module.guest-experience.title": "Experiência do Hóspede",
    "module.guest-experience.description":
      "Gestão de reservas, análise de feedback, rastreamento de preferências e insights de fidelidade",
    "module.guest-experience.analyze": "Analisar",

    /* Supply Chain */
    "module.supply-chain.title": "Cadeia de Suprimentos",
    "module.supply-chain.description":
      "Gestão de fornecedores, otimização de estoque, análises de compras e rastreamento de desperdício",

    /* Voice Commands */
    "module.voice-commands.title": "Comandos de Voz",
    "module.voice-commands.description":
      "Operações controladas por voz, orientação de áudio e fluxo de trabalho sem uso das mãos",

    /* Unified Canvas */
    "module.unified-canvas.title": "Tela Unificada",
    "module.unified-canvas.description":
      "Colaboração em equipe, contexto compartilhado e coordenação em tempo real",

    /* Predictive Maintenance */
    "module.predictive-maintenance.title": "Manutenção Preditiva",
    "module.predictive-maintenance.description":
      "Monitoramento de saúde do equipamento, predição de falhas e manutenção proativa",
    "module.predictive-maintenance.analyzing": "Analisando...",
    "module.predictive-maintenance.analyze": "Analisar",
    "module.supply-chain.optimize": "Otimizar",

    /* Template Marketplace */
    "module.template-marketplace.title": "Marketplace de Modelos",
    "module.template-marketplace.description":
      "Compartilhe, descubra e monetize modelos operacionais",
    "module.template-marketplace.createTemplate": "Criar Modelo",

    /* Supplier Network */
    "module.supplier-network.title": "Rede de Fornecedores",
    "module.supplier-network.description":
      "Poder de compra em volume e intercâmbio de rede de talentos",
    "module.supplier-network.networkSettings": "Configurações da Rede",

    /* Data Collective */
    "module.data-collective.title": "Benchmarking da Indústria",
    "module.data-collective.description":
      "Compare o desempenho e fique à frente das tendências de mercado",
    "module.data-collective.export": "Exportar",
    "module.data-collective.settings": "Configurações",

    /* PTO Management */
    "module.pto-management.title": "Gestão de PTO",
    "module.pto-management.description":
      "Fluxo de trabalho de aprovação e planejamento de cobertura",

    /* Custom Analytics */
    "module.custom-analytics.title": "Análises Personalizadas",
    "module.custom-analytics.description":
      "Painel executivo em tempo real com métricas personalizadas",
    "module.custom-analytics.autoRefresh": "Atualização Automática",

    /* Multi-Property */
    "module.multi-property.title": "Gestão Multi-Propriedade",
    "module.multi-property.description":
      "Análises entre locais e relatórios consolidados",

    /* Mobile Enhancements */
    "module.mobile-enhancements.title": "Melhorias Móveis",
    "module.mobile-enhancements.description":
      "Capacidades offline e notificações push",

    /* Global Calendar */
    "module.global-calendar.title": "Calendário Global",
    "module.global-calendar.view": "Visualizar",

    /* CRM */
    "module.crm.title": "Relações com Clientes",
    "module.crm.description": "Gerencie relacionamentos com clientes e vendas",
    "module.crm.newCustomer": "Novo Cliente",
    "module.crm.welcome": "Bem-vindo ao CRM",
    "module.crm.gettingStarted":
      "Comece a gerenciar seus relacionamentos com clientes",

    /* Engine Modules */
    "module.culinary-engine.title": "Motor Culinário",
    "module.culinary-engine.description":
      "Planejamento de Produção • Cálculos de Rendimento • Rastreamento de Alérgenos",
    "module.inventory-engine.title": "Motor de Inventário",
    "module.inventory-engine.description":
      "Rastreamento de Estoque • Detecção de Escassez • Inteligência de Compras",
    "module.labor-engine.title": "Motor de Trabalho",
    "module.labor-engine.description":
      "Agendamento de equipe e gerenciamento de tarefas",
    "module.engineering-engine.title": "Motor de Engenharia/AV",
    "module.engineering-engine.description":
      "HVAC, sistemas AV e gestão de instalações",
    "module.financials-engine.title": "Motor Financeiro",
    "module.financials-engine.description":
      "Projeções de receita e análise de margem",

    /* Maestro Dashboard */
    "module.maestro-dashboard.title": "Painel Maestro",
    "module.maestro-dashboard.loginPrompt":
      "Por favor, faça login para acessar o painel",

    /* HR Payroll */
    "module.hr-payroll.title": "Gestão de RH e Folha de Pagamento",
    "module.hr-payroll.description":
      "Funcionários, agendamento, folha de pagamento",

    /* Echo Canva Modules */
    "module.cake-order.title": "Pedido e Construtor de Bolo",
    "module.cake-order.studio": "Estúdio de Design",
    "module.cake-order.placeOrder": "Fazer Pedido",
    "module.design-editor.title": "Editor de Design",

    /* Purchasing */
    "module.purchasing.title": "Compras e Recebimento",
    "module.purchasing.description": "Gestão de operações",

    /* Genesis Modules */
    "module.genesis-a.title": "LUCCCA Genesis",
    "module.genesis-a.description":
      "Fase A — Propriedade e Escala. Isso define o comportamento padrão sem tocar em inventário ou finanças.",
    "module.genesis-b.title": "LUCCCA Genesis — Fase B",
    "module.genesis-b.description":
      "Comissários + Fulfillment Interno + Regras de Custo APN + Padrões de Cadência de Inventário.",
    "module.genesis-c.title": "Genesis C — Plano de Compras",
    "module.genesis-c.description":
      "Execute compras combinadas entre fornecedores e consolide a demanda em cronogramas de entrega otimizados",
    "module.genesis-d.title": "LUCCCA Genesis D",
    "module.genesis-d.description":
      "Regras de atribuição de custos (quem paga COGS, quem recebe crédito) — determinístico e amigável para auditoria.",
    "module.genesis-e.title": "Genesis E — Pedidos de Fulfillment Interno",
    "module.genesis-e.description":
      "Fila única + filtros para visualização unificada de solicitações/fulfillment",
    "module.genesis-f.title": "LUCCCA Genesis F",
    "module.genesis-f.description":
      "Calendário de Compras: entregas de fornecedores por dia de entrega + prazos de corte. Pedidos divididos para evitar eventos perdidos enquanto maximiza oportunidades de consolidação.",
    "module.genesis-g.title": "LUCCCA Genesis G",
    "module.genesis-g.description":
      "Compensações de Inventário + Transmissão de Disponibilidade. Compensa compras por em mãos/em pedido e transmite excedentes para pontos de venda para REOs e especiais.",
    "module.genesis-h.title": "Genesis H — Inteligência de PAR e Lead-Time",
    "module.genesis-h.description":
      "Garanta que os locais de produção mantenham inventário ideal. Nunca surpreenda o chef.",

    /* Kitchen Library */
    "module.kitchen-library.title": "Biblioteca de Receitas",
    "module.kitchen-library.description":
      "Receitas mestras com detalhamento de ingredientes e fatores de rendimento",
    "module.kitchen-library.recipes": "receitas",
    "module.kitchen-library.ingredients": "Ingredientes",
    "module.kitchen-library.selectRecipe":
      "Selecione uma receita para ver os ingredientes",

    /* Template Marketplace - Portuguese */
    "module.template-marketplace.tabs.browse": "Navegar",
    "module.template-marketplace.tabs.myLibrary": "Minha Biblioteca",
    "module.template-marketplace.tabs.analytics": "Análises",
    "module.template-marketplace.searchPlaceholder": "Buscar modelos...",
    "module.template-marketplace.sortBy": "Ordenar por",
    "module.template-marketplace.sort.mostPopular": "Mais Popular",
    "module.template-marketplace.sort.topRated": "Mais Bem Avaliado",
    "module.template-marketplace.sort.newest": "Mais Recente",
    "module.template-marketplace.sort.priceLow": "Preço: Menor para Maior",
    "module.template-marketplace.sort.priceHigh": "Preço: Maior para Menor",
    "module.template-marketplace.difficulty": "Dificuldade",
    "module.template-marketplace.difficulty.all": "Todos os Níveis",
    "module.template-marketplace.difficulty.beginner": "Iniciante",
    "module.template-marketplace.difficulty.intermediate": "Intermediário",
    "module.template-marketplace.difficulty.advanced": "Avançado",
    "module.template-marketplace.categories.menus": "Cardápios",
    "module.template-marketplace.categories.recipes": "Receitas",
    "module.template-marketplace.categories.workflows": "Fluxos de Trabalho",
    "module.template-marketplace.categories.schedules": "Cronogramas",
    "module.template-marketplace.categories.events": "Eventos",
    "module.template-marketplace.categories.training": "Treinamento",
    "module.template-marketplace.download": "Baixar",
    "module.template-marketplace.favorite": "Favorito",
    "module.template-marketplace.analytics.totalTemplates": "Total de Modelos",
    "module.template-marketplace.analytics.activeUsers": "Usuários Ativos",
    "module.template-marketplace.analytics.totalDownloads":
      "Total de Downloads",
    "module.template-marketplace.analytics.avgRating": "Avaliação Média",
    "module.template-marketplace.analytics.categoryDistribution":
      "Distribuição por Categoria",
    "module.template-marketplace.analytics.topTemplates":
      "Modelos Mais Populares",
    "module.template-marketplace.noFavorites": "Nenhum favorito ainda",
    "module.template-marketplace.heartTemplates":
      "Marque modelos com coração para salvá-los na sua biblioteca",

    /* Supplier Network - Portuguese */
    "module.supplier-network.tabs.suppliers": "Fornecedores",
    "module.supplier-network.tabs.talent": "Talento",
    "module.supplier-network.metrics.totalSavings": "Economia Total",
    "module.supplier-network.metrics.thisYear": "Este ano",
    "module.supplier-network.metrics.networkSuppliers": "Fornecedores da Rede",
    "module.supplier-network.metrics.activePartners": "Parceiros ativos",
    "module.supplier-network.metrics.talentPool": "Pool de Talentos",
    "module.supplier-network.metrics.availableMembers": "Membros disponíveis",
    "module.supplier-network.metrics.avgDelivery": "Entrega Média",
    "module.supplier-network.metrics.days": "Dias",
    "module.supplier-network.searchPlaceholder":
      "Buscar fornecedores ou talentos...",
    "module.supplier-network.categories.produce": "Produtos",
    "module.supplier-network.categories.meat": "Carne",
    "module.supplier-network.categories.dairy": "Laticínios",
    "module.supplier-network.categories.pantry": "Despensa",
    "module.supplier-network.categories.beverages": "Bebidas",
    "module.supplier-network.categories.specialty": "Especialidades",
    "module.supplier-network.roles.chef": "Chef",
    "module.supplier-network.roles.baker": "Padeiro",
    "module.supplier-network.roles.bartender": "Bartender",
    "module.supplier-network.roles.server": "Garçom",
    "module.supplier-network.roles.manager": "Gerente",
    "module.supplier-network.roles.specialist": "Especialista",

    /* Data Collective - Portuguese */
    "module.data-collective.tabs.benchmarks": "Benchmarks",
    "module.data-collective.tabs.insights": "Insights",
    "module.data-collective.tabs.competitors": "Concorrentes",
    "module.data-collective.tabs.alerts": "Alertas",
    "module.data-collective.metrics.overallPercentile": "Percentil Geral",
    "module.data-collective.metrics.vsIndustry": "vs média da indústria",
    "module.data-collective.metrics.exceeding": "Excedendo",
    "module.data-collective.metrics.ofMetrics": "de 6 métricas",
    "module.data-collective.metrics.benchmarkTrend": "Tendência de Benchmark",
    "module.data-collective.metrics.monthImprovement": "melhoria de 6 meses",
    "module.data-collective.metrics.gapToTop": "Lacuna para o Topo",
    "module.data-collective.metrics.percentagePoints": "pontos percentuais",
    "module.data-collective.charts.performanceRadar": "Radar de Desempenho",
    "module.data-collective.charts.monthTrend": "Tendência de 6 Meses",
    "module.data-collective.charts.you": "Você",
    "module.data-collective.charts.industryAvg": "Média da Indústria",
    "module.data-collective.charts.topPerformer": "Melhor Desempenho",

    /* Guest Experience - Portuguese */
    "module.guest-experience.tabs.overview": "Visão Geral",
    "module.guest-experience.tabs.reservations": "Reservas",
    "module.guest-experience.tabs.feedback": "Feedback",
    "module.guest-experience.tabs.preferences": "Preferências",
    "module.guest-experience.metrics.totalReservations": "Total de Reservas",
    "module.guest-experience.metrics.confirmed": "Confirmadas",
    "module.guest-experience.metrics.activeReservations": "Reservas Ativas",
    "module.guest-experience.metrics.totalFeedback": "Total de Feedback",
    "module.guest-experience.metrics.avgRating": "Avaliação Média",
    "module.guest-experience.metrics.returnRate": "Taxa de Retorno",
    "module.guest-experience.sentiment.positive": "Positivo",
    "module.guest-experience.sentiment.neutral": "Neutro",
    "module.guest-experience.sentiment.negative": "Negativo",
    "module.guest-experience.charts.satisfactionTrend":
      "Tendência de Satisfação",
    "module.guest-experience.charts.feedbackDistribution":
      "Distribuição de Feedback",
    "module.guest-experience.charts.guestSentimentSummary":
      "Resumo de Sentimento dos Hóspedes",
    "module.guest-experience.upcomingReservations": "Próximas Reservas",
    "module.guest-experience.next7Days": "Cronograma dos próximos 7 dias",
    "module.guest-experience.recentFeedback": "Feedback Recente dos Hóspedes",
    "module.guest-experience.preferences":
      "Preferências e Fidelidade dos Hóspedes",
    "module.guest-experience.willReturn": "Voltará",
    "module.guest-experience.metrics.willReturn": "Voltará",
    "module.guest-experience.metrics.next7Days": "Próximos 7 Dias",
    "module.guest-experience.metrics.knownGuests": "Hóspedes Conhecidos",
    "module.guest-experience.metrics.loyaltySpend": "Gasto de Fidelidade",
    "module.guest-experience.metrics.basedOnReviews":
      "Baseado em {count} avaliações",
    "module.guest-experience.metrics.retention": "retenção",
    "module.guest-experience.metrics.guests": "hóspedes",
    "module.guest-experience.metrics.withSavedPreferences":
      "Com preferências salvas",
    "module.guest-experience.metrics.lifetimeRevenue": "Receita vitalícia",
    "module.guest-experience.insights": "Insights",
    "module.guest-experience.retentionRate": "Retenção",
    "module.guest-experience.activeReservations": "Reservas ativas",

    /* Quality Assurance - Portuguese */
    "module.quality-assurance.metrics.avgQualityScore":
      "Pontuação Média de Qualidade",
    "module.quality-assurance.metrics.acrossAllRecipes": "Em todas as receitas",
    "module.quality-assurance.metrics.checksPassed": "Verificações Aprovadas",
    "module.quality-assurance.metrics.passRate": "taxa de aprovação",
    "module.quality-assurance.metrics.issuesFound": "Problemas Encontrados",
    "module.quality-assurance.metrics.underReview": "em revisão",
    "module.quality-assurance.metrics.complianceScore":
      "Pontuação de Conformidade",
    "module.quality-assurance.metrics.acrossAllAreas": "Em todas as áreas",
    "module.quality-assurance.metrics.recipeStandards": "Padrões de Receitas",
    "module.quality-assurance.metrics.fullyCompliant": "totalmente conforme",
    "module.quality-assurance.tabs.overview": "Visão Geral",
    "module.quality-assurance.tabs.recipes": "Padrões de Receitas",
    "module.quality-assurance.tabs.checks": "Verificações de Qualidade",
    "module.quality-assurance.tabs.audits": "Rastreamento de Auditoria",
    "module.quality-assurance.complianceByArea": "Conformidade por Área",
    "module.quality-assurance.qualityCheckSummary":
      "Resumo de Verificação de Qualidade",
    "module.quality-assurance.passed": "Aprovado",
    "module.quality-assurance.underReview": "Em Revisão",
    "module.quality-assurance.failed": "Falhou",
    "module.quality-assurance.complianceDetails": "Detalhes de Conformidade",
    "module.quality-assurance.standardRecipes": "Receitas Padrão",
    "module.quality-assurance.qualityScoresAndCompliance":
      "Pontuações de qualidade e rastreamento de conformidade",
    "module.quality-assurance.prep": "Preparo",
    "module.quality-assurance.serving": "Porção",
    "module.quality-assurance.qualityScore": "Pontuação de Qualidade",
    "module.quality-assurance.compliance": "Conformidade",
    "module.quality-assurance.lastUpdated": "Última Atualização",
    "module.quality-assurance.status": "Status",
    "module.quality-assurance.fullyCompliant": "✓ Totalmente Conforme",
    "module.quality-assurance.monitor": "⚠ Monitorar",
    "module.quality-assurance.actionRequired": "✕ Ação Necessária",
    "module.quality-assurance.dailyQualityChecks":
      "Verificações Diárias de Qualidade",
    "module.quality-assurance.recentQualityControl":
      "Avaliações recentes de controle de qualidade",
    "module.quality-assurance.auditHistory": "Histórico de Auditoria",
    "module.quality-assurance.completeQualityAudit":
      "Log completo de auditoria de qualidade",
    "module.quality-assurance.dailyAudit": "Auditoria Diária",
    "module.quality-assurance.weeklyAudit": "Auditoria Semanal",
    "module.quality-assurance.monthlyAudit": "Auditoria Mensal",
    "module.quality-assurance.incidentReport": "Relatório de Incidente",
    "module.quality-assurance.score": "Pontuação",
    "module.quality-assurance.inspector": "Inspetor",
    "module.quality-assurance.issues": "Problemas",
    "module.quality-assurance.correctionsDue": "Correções Necessárias",

    /* PTO Management - Portuguese */
    "module.pto-management.generatePTOAnalytics": "Gerar Análises de PTO",
    "module.pto-management.analyzing": "Analisando...",
    "module.pto-management.analyzePTORequests": "Analisar Solicitações de PTO",
    "module.pto-management.totalRequests": "Total de Solicitações",
    "module.pto-management.approved": "Aprovado",
    "module.pto-management.pending": "Pendente",
    "module.pto-management.denied": "Negado",
    "module.pto-management.daysApproved": "Dias Aprovados",
    "module.pto-management.tempHiresNeeded":
      "Contratações Temporárias Necessárias",
    "module.pto-management.upcomingBlackoutPeriods":
      "Períodos de Bloqueio Próximos",
    "module.pto-management.days": "dias",
    "module.pto-management.dates": "Datas",
    "module.pto-management.impact": "Impacto",
    "module.pto-management.coverage": "Cobertura",
    "module.pto-management.keyInsights": "Insights Principais",
    "module.pto-management.coverageStrategy": "Estratégia de Cobertura",
    "module.pto-management.temporaryHires": "Contratações Temporárias",
    "module.pto-management.crossTraining": "Treinamento Cruzado",
    "module.pto-management.generateNewAnalysis": "Gerar Nova Análise",
    "module.pto-management.vacation": "Férias",
    "module.pto-management.sick": "Doença",
    "module.pto-management.personal": "Pessoal",
    "module.pto-management.unpaid": "Não Remunerado",
    "module.pto-management.sabbatical": "Sabático",
    "module.pto-management.low": "Baixo",
    "module.pto-management.medium": "Médio",
    "module.pto-management.high": "Alto",

    /* Common Tab Labels - Portuguese */
    "common.tabs.overview": "Visão Geral",
    "common.tabs.dashboard": "Painel",
    "common.tabs.analytics": "Análises",
    "common.tabs.settings": "Configurações",
    "common.tabs.reports": "Relatórios",
    "common.tabs.details": "Detalhes",
    "common.buttons.save": "Salvar",
    "common.buttons.cancel": "Cancelar",
    "common.buttons.submit": "Enviar",
    "common.buttons.delete": "Excluir",
    "common.buttons.edit": "Editar",
    "common.buttons.add": "Adicionar",
    "common.buttons.view": "Visualizar",
    "common.buttons.generate": "Gerar",
    "common.buttons.filter": "Filtrar",
    "common.buttons.search": "Buscar",
    "common.buttons.export": "Exportar",
    "common.buttons.import": "Importar",
    "common.buttons.all": "Todos",
    "common.status.ok": "OK",
    "common.status.low": "Baixo",
    "common.status.critical": "Crítico",
    "common.status.pending": "Pendente",
    "common.status.approved": "Aprovado",
    "common.status.denied": "Negado",

    /* Inventory Engine - Portuguese */
    "module.inventory-engine.tabs.overview": "Visão Geral",
    "module.inventory-engine.tabs.stock": "Níveis de Estoque",
    "module.inventory-engine.tabs.shortages": "Falta de Estoque",
    "module.inventory-engine.tabs.orders": "Sugestões de Pedidos",
    "module.inventory-engine.tabs.vendors": "Carga de Fornecedores",
    "module.inventory-engine.tabs.alerts": "Alertas e Sinalizações",
    "module.inventory-engine.metrics.ingredients": "Ingredientes",
    "module.inventory-engine.metrics.belowPar": "Abaixo do Padrão",
    "module.inventory-engine.metrics.onHandValue": "Valor em Mãos",
    "module.inventory-engine.metrics.shortageAlerts": "Alertas de Falta",
    "module.inventory-engine.criticalShortages": "Faltas Críticas",
    "module.inventory-engine.urgentOrders": "Pedidos Urgentes",
    "module.inventory-engine.inventoryHealth": "Saúde do Estoque",
    "module.inventory-engine.noCriticalShortages": "Sem faltas críticas",
    "module.inventory-engine.noUrgentOrders":
      "Nenhum pedido urgente necessário",
    "module.inventory-engine.shortBy": "Faltando",
    "module.inventory-engine.units": "unidades",
    "module.inventory-engine.order": "Pedir",
    "module.inventory-engine.from": "de",
    "module.inventory-engine.allInventoryAdequate":
      "Todos os níveis de estoque adequados",
    "module.inventory-engine.noShortagesDetected": "Nenhuma falta detectada",
    "module.inventory-engine.shortByUnits": "Faltando {qty} unidades",
    "module.inventory-engine.ingredient": "Ingrediente",
    "module.inventory-engine.onHand": "Em Mãos",
    "module.inventory-engine.parLevel": "Nível Padrão",
    "module.inventory-engine.status": "Status",
    "module.inventory-engine.vendor": "Fornecedor",
    "module.inventory-engine.value": "Valor",

    /* Culinary Engine - Portuguese */
    "module.culinary-engine.tabs.overview": "Visão Geral",
    "module.culinary-engine.tabs.menu": "Seleção de Cardápio",
    "module.culinary-engine.tabs.recipes": "Receitas",
    "module.culinary-engine.tabs.production": "Plano de Produção",
    "module.culinary-engine.tabs.allergen": "Matriz de Alergênicos",
    "module.culinary-engine.tabs.yields": "Rendimentos",
    "module.culinary-engine.tabs.orders": "Ordens de Compra",
    "module.culinary-engine.tabs.flags": "Alertas e Sinalizações",
    "module.culinary-engine.metrics.guests": "Hóspedes",
    "module.culinary-engine.metrics.laborHours": "Horas de Trabalho",
    "module.culinary-engine.metrics.foodCost": "Custo de Alimentos",
    "module.culinary-engine.metrics.totalCost": "Custo Total",
    "module.culinary-engine.criticalIssues": "Problemas Críticos",
    "module.culinary-engine.noCriticalIssues": "Sem problemas críticos",
    "module.culinary-engine.shortages": "Faltas",
    "module.culinary-engine.allInventoryAdequate": "Todo o estoque adequado",
    "module.culinary-engine.productionTimeline": "Cronograma de Produção",
    "module.culinary-engine.prepTime": "Tempo de Preparo",
    "module.culinary-engine.criticalPath": "Caminho Crítico",
    "module.culinary-engine.estCompletion": "Conclusão Estimada",
    "module.culinary-engine.wasteRate": "Taxa de Desperdício",
    "module.culinary-engine.minutes": "minutos",
    "module.culinary-engine.need": "Precisa",
    "module.culinary-engine.have": "Tem",

    /* Purchasing & Receiving - Portuguese */
    "module.purchasing.nav.dashboard": "Painel",
    "module.purchasing.nav.purchaseOrders": "Ordens de Compra",
    "module.purchasing.nav.receiving": "Recebimento",
    "module.purchasing.nav.onTheDock": "No Doca",
    "module.purchasing.nav.invoiceScan": "Digitalização de Faturas",
    "module.purchasing.nav.invoices": "Faturas",
    "module.purchasing.nav.haccp": "HACCP e Treinamento",
    "module.purchasing.nav.vendors": "Gestão de Fornecedores",
    "module.purchasing.nav.commissary": "Pedidos de Comissariado",
    "module.purchasing.nav.inventory": "Estoque",
    "module.purchasing.nav.storage": "Layout de Armazenamento",
    "module.purchasing.nav.finance": "Financeiro",
    "module.purchasing.nav.analytics": "Análises",
    "module.purchasing.nav.administration": "Administração",
    "module.purchasing.categories.operations": "Operações",
    "module.purchasing.categories.inventory": "Estoque",
    "module.purchasing.categories.analysis": "Análise",
    "module.purchasing.categories.admin": "Administração",

    /* HR & Payroll - Portuguese */
    "module.hr-payroll.nav.dashboard": "Painel",
    "module.hr-payroll.nav.employees": "Funcionários",
    "module.hr-payroll.nav.scheduling": "Agendamento",
    "module.hr-payroll.nav.payroll": "Folha de Pagamento",
    "module.hr-payroll.nav.benefits": "Benefícios",
    "module.hr-payroll.nav.training": "Treinamento",

    "sidebar.coreOperations": "Operações Principais",
    "sidebar.financialSupply": "Financeiro e Cadeia de Suprimentos",
    "sidebar.designAnalytics": "Design e Análises",
    "sidebar.communitySupport": "Comunidade e Suporte",
    "sidebar.maestroBQT": "Maestro BQT",
    "sidebar.orderingInventory": "Pedidos e Estoque",
    "sidebar.purchasingReceiving": "Compras e Recebimento",
    "sidebar.mixologySommelier": "Mixologia e Sommelier",
    "sidebar.echoAurum": "EchoAurum",
    "sidebar.echoStratus": "EchoStratus",
    "sidebar.echoEvents": "Echo Events",
    "sidebar.echoLayout": "EchoLayout",

    /* EchoAi Chat - Portuguese */
    "echo.greeting": "Olá, eu sou Echo.",
    "echo.intro":
      "Peça-me para orquestrar um novo módulo, ajustar acessibilidade, ou narrar o próximo passo e eu te guiarei.",
    "echo.thinking": "Pensando",
    "echo.listening": "Echo está ouvindo...",
    "echo.talkOrType": "Fale com Echo ou digite uma solicitação...",
    "echo.askEcho": "Pergunte ao Echo AI...",
    "echo.send": "Enviar",
    "echo.micLive": "Microfone ativo",
    "echo.micOn": "Microfone ligado",
    "echo.micOff": "Microfone desligado",
    "echo.muteMicrophone": "Silenciar microfone",
    "echo.enableMicrophone": "Ativar microfone",
    "echo.selectPersona": "Selecionar persona do Echo",
    "echo.toggleVoiceReplies": "Alternar respostas de voz",
    "echo.voiceReply": "Resposta de voz",
    "echo.premium": "Premium",
    "echo.selectPremiumVoice": "Selecionar voz premium",
    "echo.selectVoice": "Selecionar voz",
    "echo.auraDensity": "Densidade da aura",
    "echo.adjustChatOpacity": "Ajustar opacidade do chat",
    "echo.downloadLastVoice": "Baixar última voz",
    "echo.save": "Salvar",
  },
};

const I18nCtx = React.createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: string) => string;
  translate: (text: string, options?: TranslationOptions) => Promise<string>;
  translateBatch: (
    texts: string[],
    options?: TranslationOptions,
  ) => Promise<string[]>;
} | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = React.useState<Lang>(() => {
    const stored = localStorage.getItem("lang") as Lang | null;
    return stored &&
      ["en", "es", "fr", "de", "it", "pt", "ja", "zh", "ar", "nl"].includes(
        stored,
      )
      ? stored
      : "en";
  });

  // Initialize language sync system on mount
  React.useEffect(() => {
    initLanguageSync();
  }, []);

  React.useEffect(() => {
    // Use the centralized language sync system
    syncChangeLanguage(lang);
  }, [lang]);

  // React to external language changes (storage or custom event)
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lang" && typeof e.newValue === "string") {
        const val = (e.newValue as Lang) || "en";
        setLang(val);
      }
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail as Lang | undefined;
      if (detail) setLang(detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("i18n:lang", onCustom as any);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("i18n:lang", onCustom as any);
    };
  }, []);

  const dict = React.useMemo(
    () => dictionaries[lang] || dictionaries.en,
    [lang],
  );

  const t = (k: string) => dict[k] ?? dictionaries.en[k] ?? k;

  const translate = React.useCallback(
    async (text: string, options?: TranslationOptions) => {
      if (!text || lang === "en" || options?.skipTranslation) {
        return text;
      }
      return translateText(text, lang, options?.context);
    },
    [lang],
  );

  const translateBatch = React.useCallback(
    async (texts: string[], options?: TranslationOptions) => {
      if (lang === "en" || options?.skipTranslation) {
        return texts;
      }

      return Promise.all(
        texts.map((text) => translateText(text, lang, options?.context)),
      );
    },
    [lang],
  );

  return (
    <I18nCtx.Provider value={{ lang, setLang, t, translate, translateBatch }}>
      {children}
    </I18nCtx.Provider>
  );
}

export function useI18n() {
  const ctx = React.useContext(I18nCtx);
  if (!ctx) {
    // Fallback during initialization or HMR - return default empty context
    return {
      lang: "en" as Lang,
      setLang: () => {}, // no-op
      t: (k: string) => k,
    };
  }
  return ctx;
}
