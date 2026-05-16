/**
 * Content Safety Filter
 * Detects and filters inappropriate, sexual, or off-topic content
 * Redirects users back to professional culinary questions
 */

interface ContentFilterResult {
  isSafe: boolean;
  severity: 'safe' | 'warning' | 'blocked';
  category?: string;
  message?: string;
}

/**
 * Adult/Sexual content keywords and patterns
 */
const ADULT_KEYWORDS = new Set([
  // Sexual terms
  'sex', 'porn', 'xxx', 'nsfw', 'adult', 'nude', 'naked', 'horny',
  'sexy', 'strip', 'erotic', 'xxx', 'sexual', 'orgasm', 'penis', 'vagina',
  'breast', 'butt', 'ass', 'dick', 'cock', 'pussy', 'fuck', 'shit',
  'damn', 'bitch', 'whore', 'slut', 'creampie', 'bukkake', 'amateur',
  'deepthroat', 'cumshot', 'blowjob', 'handjob', 'footjob', 'pegging',
  
  // Drugs and illegal content
  'weed', 'pot', 'coke', 'heroin', 'meth', 'crack', 'ecstasy', 'mdma',
  'cocaine', 'methamphetamine', 'lsd', 'acid', 'shrooms', 'psilocybin',
  'drug', 'dealer', 'pusher', 'junkie', 'addict',
  
  // Violence and harm
  'kill', 'murder', 'rape', 'assault', 'bomb', 'explosive', 'shoot',
  'stab', 'slash', 'violence', 'terrorist', 'weapon', 'gun',
]);

/**
 * Off-topic keywords that don't belong in culinary context
 */
const OFF_TOPIC_KEYWORDS = new Set([
  // Politics
  'politics', 'politician', 'election', 'candidate', 'vote', 'republican',
  'democrat', 'left-wing', 'right-wing', 'conspiracy', 'qanon',
  
  // Religion (when controversial)
  'god', 'allah', 'jesus', 'bible', 'quran', 'religion', 'atheist',
  
  // Conspiracy/misinformation
  'conspiracy', 'illuminati', 'chemtrails', 'flat-earth', 'hoax',
  'fake-news', 'deepfake',
]);

/**
 * Culinary and hospitality related acceptable topics
 */
const CULINARY_KEYWORDS = new Set([
  'recipe', 'cook', 'bake', 'cuisine', 'chef', 'kitchen', 'food',
  'ingredient', 'dish', 'sauce', 'technique', 'method', 'pastry',
  'bread', 'dessert', 'appetizer', 'entree', 'main', 'side', 'soup',
  'salad', 'wine', 'beverage', 'drink', 'cocktail', 'restaurant',
  'hospitality', 'service', 'dining', 'menu', 'plating', 'flavor',
  'ingredient', 'allergen', 'nutrition', 'diet', 'dietary', 'vegan',
  'vegetarian', 'gluten-free', 'dairy-free', 'cost', 'costing', 'price',
  'inventory', 'purchasing', 'receiving', 'supply', 'vendor', 'wholesale',
  'retail', 'food-safety', 'haccp', 'sanitation', 'hygiene', 'haccp',
  'temperature', 'time', 'contamination', 'storage', 'freezer', 'cooler',
  'equipment', 'utensil', 'table', 'seat', 'reservation', 'booking',
  'server', 'bartender', 'sommelier', 'maître', 'host', 'hostess',
  'busser', 'dishwasher', 'manager', 'director', 'owner', 'operator',
]);

/**
 * Check if content is appropriate for culinary context
 */
export function filterContent(query: string): ContentFilterResult {
  const normalized = query.toLowerCase().trim();
  const words = normalized.split(/\s+/);

  // Check for adult/sexual content
  for (const word of words) {
    if (ADULT_KEYWORDS.has(word)) {
      return {
        isSafe: false,
        severity: 'blocked',
        category: 'adult-content',
        message: "I'm designed to help with professional culinary and hospitality topics. Let's keep our conversation focused on food, cooking, and restaurant operations. How can I help with your culinary questions?",
      };
    }
  }

  // Check for off-topic content
  let hasOffTopicWords = 0;
  for (const word of words) {
    if (OFF_TOPIC_KEYWORDS.has(word)) {
      hasOffTopicWords++;
    }
  }

  if (hasOffTopicWords > 0 && words.length < 15) {
    // Short queries with off-topic keywords are likely off-topic
    return {
      isSafe: false,
      severity: 'blocked',
      category: 'off-topic',
      message: "I'm specifically trained for culinary and hospitality topics. I can help you with cooking techniques, recipes, food safety, kitchen management, menu planning, and more. What culinary question can I assist with?",
    };
  }

  // Check if query has any culinary relevance
  let hasCulinaryKeywords = 0;
  for (const word of words) {
    if (CULINARY_KEYWORDS.has(word)) {
      hasCulinaryKeywords++;
    }
  }

  // If the query is very short and has no culinary keywords, might be off-topic
  if (words.length < 5 && hasCulinaryKeywords === 0) {
    return {
      isSafe: false,
      severity: 'warning',
      category: 'unclear-context',
      message: "Your question doesn't seem to be about culinary or hospitality topics. Could you clarify what you're asking about? I specialize in cooking techniques, ingredients, kitchen management, menu planning, food safety, and restaurant operations.",
    };
  }

  // Content is safe
  return {
    isSafe: true,
    severity: 'safe',
  };
}

/**
 * Get a friendly redirect message based on filter result
 */
export function getFilterMessage(result: ContentFilterResult): string {
  return result.message || 
    "I'm here to help with culinary and hospitality questions. Let's refocus on that!";
}

/**
 * Check if a term should be auto-added to knowledge base
 * Reject adult/explicit terms
 */
export function isTermAppropriate(term: string): boolean {
  const normalized = term.toLowerCase();
  const words = normalized.split(/[\s\-_]/);

  for (const word of words) {
    if (ADULT_KEYWORDS.has(word)) {
      return false;
    }
  }

  return true;
}

/**
 * Filter confidence for adding to knowledge base
 * Adult/explicit content gets 0 confidence (rejected)
 */
export function getTermAppropriateness(term: string): number {
  if (!isTermAppropriate(term)) {
    return 0; // Completely inappropriate
  }
  return 1; // Fully appropriate
}
