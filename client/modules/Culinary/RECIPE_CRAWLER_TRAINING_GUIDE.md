# Recipe Crawler Training System

## Overview

The Recipe Crawler Training System is a two-phase knowledge acquisition system for Echo AI:

**Phase 1: Training/Building (Current)**
- Crawler searches multiple recipe sources automatically
- Analyzes recipes for balance, texture, flavor profiles, techniques
- Builds comprehensive knowledge base from diverse sources
- Stores analyzed data in Pinecone vector database

**Phase 2: Production**
- Uses trained knowledge base to enhance user-submitted recipes
- Provides recommendations for improvements
- Leverages learned patterns from thousands of recipes

## Architecture

### Multi-Source Recipe APIs

The system integrates with multiple recipe sources using free tier options:

#### 1. **USDA FoodData Central** (Free, Unlimited)
- **Endpoint**: `POST /api/recipes/nutrition`
- **Data**: Nutritional composition of 300,000+ foods
- **Features**: Calories, proteins, carbs, fats, fiber
- **No API key required** - Direct REST API access
- **Used for**: Nutritional analysis and ingredient understanding

#### 2. **Recipe Databases** (Web Scraping)
- **Endpoint**: `POST /api/recipes/search`
- **Sources**: AllRecipes, Food Network, Serious Eats, Bon Appétit
- **Data**: Complete recipes with instructions and ingredients
- **Features**: Multiple sources for diversity
- **No API key required** - Simulated scraping for training

#### 3. **Restaurant Menus** (Training Data)
- **Endpoint**: `POST /api/recipes/menus`
- **Data**: Professional dish preparation methods
- **Features**: Fine dining techniques and combinations
- **Used for**: Professional culinary learning

#### 4. **Cooking Technique Videos** (Meta Data)
- **Endpoint**: `POST /api/recipes/videos`
- **Data**: Video metadata and technique information
- **Features**: Chef-verified techniques
- **Used for**: Methodology and best practices

#### 5. **Culinary Blogs** (Knowledge Articles)
- **Endpoint**: `POST /api/recipes/blogs`
- **Data**: Articles from Serious Eats, Bon Appétit, etc.
- **Features**: Scientific and practical insights
- **Used for**: Deep knowledge and rationale

#### 6. **Ingredient Suppliers** (Quality Data)
- **Endpoint**: `POST /api/recipes/suppliers`
- **Data**: Premium ingredients and sourcing
- **Features**: Quality grades, origins, availability
- **Used for**: Ingredient selection and sourcing knowledge

### Recipe Analysis Engine

Each recipe is analyzed across three dimensions:

#### 1. **Nutritional Balance**
```javascript
{
  proteinBalance: 0-100,    // % of calories from protein
  carbBalance: 0-100,       // % of calories from carbs
  fatBalance: 0-100,        // % of calories from fat
  score: 0-100              // Overall balance score
}
```

**Ideal Ratios** (Recommended):
- Protein: 25-35%
- Carbs: 45-65%
- Fat: 20-35%

#### 2. **Texture Complexity**
```javascript
{
  types: ["crispy", "creamy", "tender", "crunchy", "chewy", "flaky"],
  complexity: 1-5  // Number of different textures in recipe
}
```

Texture combinations create interesting dishes and teach Echo about texture pairing.

#### 3. **Flavor Profiles**
```javascript
{
  primary: ["savory", "sweet", "sour", "bitter", "spicy", "aromatic"],
  secondary: ["secondary_flavors"],
  balance: "balanced" | "intense" | "mild"
}
```

## Training Data Flow

```
1. Crawler Initialization
   ├─ Load recipes from database
   └─ Initialize from multiple sources

2. Recipe Search & Collection
   ├─ Query: "balanced chicken pasta"
   ├─ Sources:
   │  ├─ AllRecipes: 5 recipes
   │  ├─ Food Network: 5 recipes
   │  ├─ Serious Eats: 5 recipes
   │  └─ USDA: Nutritional data for each ingredient
   └─ Results: ~50+ recipes per search

3. Recipe Analysis
   ├─ Extract ingredients & instructions
   ├─ Analyze nutritional composition
   ├─ Identify texture elements
   ├─ Detect flavor profiles
   └─ Calculate balance scores

4. Knowledge Extraction
   ├─ Pattern recognition
   ├─ Technique identification
   ├─ Best practice detection
   └─ Knowledge relationships

5. Vector Embedding & Storage
   ├─ Convert to embeddings
   ├─ Store in Pinecone
   └─ Enable similarity search
```

## API Endpoints

### Recipe Search
```bash
POST /api/recipes/search
{
  "query": "Italian pasta",
  "sources": ["AllRecipes", "Food Network"],
  "limit": 10
}
```

### Nutritional Data
```bash
POST /api/recipes/nutrition
{
  "query": "chicken",
  "limit": 10
}
```

### Analysis
```bash
POST /api/recipes/analyze
{
  "recipe": {
    "title": "Chicken Pasta",
    "ingredients": [...],
    "instructions": "...",
    "nutrition": {...}
  }
}
```

### Culinary Search
```bash
POST /api/recipes/culinary-search
{
  "cuisine": "Italian",
  "technique": "roasting",
  "limit": 5
}
```

## Knowledge Base Building

### Training Queries by Domain

#### Culinary Science
- "balanced protein recipes"
- "vegetable-forward dishes"
- "fermented ingredients"
- "umami flavor building"

#### Pastry Science
- "laminated dough techniques"
- "emulsion stabilization"
- "sugar crystallization"
- "yeast fermentation"

#### Flavor Engineering
- "sweet and savory balance"
- "acid counterpoints"
- "aromatic aromatics"
- "texture contrast"

#### Technique Mastery
- "proper knife cuts"
- "heat control"
- "timing optimization"
- "plating methods"

## Learning Modes

### Mode 1: Learning (Continuous Training)
- Runs automatically in background
- Searches 3-5 new queries every 2 minutes
- Analyzes recipes as they're collected
- Continuously updates knowledge base
- **Recommended for**: Initial knowledge building

### Mode 2: On-Demand (Targeted Training)
- Triggered by specific queries
- Searches when user needs specific knowledge
- Focused collection on specific domains
- **Recommended for**: Filling knowledge gaps

## Progress Tracking

The Knowledge Progress Dashboard tracks:
- Overall coverage percentage (0-100%)
- Knowledge items learned (total count)
- Culinary types covered:
  - General Culinary (5% - 100%)
  - Pastry & Desserts (0% - 100%)
  - Baking & Bread (0% - 100%)
  - Banquet & Plated (0% - 100%)
- Regional specializations (coming soon)

## Data Quality & Analysis

### Balance Scoring
Recipes are rated on macronutrient distribution:
- **Excellent** (85-100): Ideal macro ratios
- **Good** (70-84): Close to ideal
- **Fair** (50-69): Needs adjustment
- **Poor** (<50): Imbalanced

### Texture Complexity
- **Low** (1-2 textures): Simple preparations
- **Medium** (3-4 textures): Well-rounded dishes
- **High** (5+ textures): Complex, interesting dishes

### Flavor Balance
- **Balanced**: Multiple flavor dimensions present
- **Intense**: 3+ strong flavors competing
- **Mild**: Subtle flavors, simple profiles

## Integration Points

### With Echo AI³
- **Knowledge Access**: Echo can query learned patterns
- **Recipe Enhancement**: Apply knowledge to user recipes
- **Recommendations**: Suggest improvements based on patterns
- **Technique Sharing**: Share learned techniques

### With Pinecone
- **Storage**: All analyzed recipes stored as vectors
- **Similarity Search**: Find similar recipes by flavor/technique
- **Clustering**: Group recipes by characteristics
- **Retrieval**: Fast lookup during production

### With Supabase
- **Recipe Storage**: Persist original recipes
- **Metadata**: Store analysis results
- **Training Sessions**: Log crawler activities
- **User Recipes**: Store user-submitted recipes for analysis

## Production Readiness

To transition to Production Mode:

1. **Knowledge Base Target**
   - [ ] 1000+ analyzed recipes
   - [ ] Coverage >80% of culinary types
   - [ ] Flavor profile database complete
   - [ ] Technique catalog established

2. **Quality Validation**
   - [ ] Manual review of 100 sample recipes
   - [ ] Comparison with expert guidelines
   - [ ] Accuracy testing on known dishes
   - [ ] User feedback integration

3. **Performance Optimization**
   - [ ] Pinecone index optimization
   - [ ] Query latency <500ms
   - [ ] Batch processing for recommendations
   - [ ] Cache frequently accessed patterns

4. **Documentation**
   - [ ] User-facing knowledge guide
   - [ ] API documentation for integrations
   - [ ] Training data source attribution
   - [ ] Limitations and scope documentation

## Future Enhancements

### Planned Improvements
- [ ] Real API integrations (Spoonacular, Edamam free tier)
- [ ] Video technique extraction (YouTube API)
- [ ] Chef recommendation integration
- [ ] Supply chain optimization
- [ ] Cross-cuisine pattern recognition
- [ ] Dietary preference handling
- [ ] Allergen interaction analysis

### Advanced Features
- [ ] Recipe generation based on constraints
- [ ] Seasonal ingredient recommendations
- [ ] Nutritional goal tracking
- [ ] Cost optimization analysis
- [ ] Sustainability scoring

## Troubleshooting

### Crawler Not Starting
1. Check Knowledge Progress Dashboard
2. Verify recipes are loaded in database
3. Check browser console for errors
4. Verify API endpoints responding: `/api/recipes/search`

### No Progress Updates
- Refresh page to sync state
- Try manual query via "Learning Mode" button
- Check server logs for API errors

### Knowledge Not Persisting
- Verify Pinecone connection status
- Check Supabase database connection
- Review Pinecone index creation logs

## API Keys (For Future Real Implementations)

When ready to use real APIs:
- **Spoonacular**: https://spoonacular.com/food-api (free tier)
- **Edamam**: https://developer.edamam.com (free tier)
- **USDA**: No key required
- **YouTube API**: For technique videos (free tier with limits)

## References

- [USDA FoodData Central API](https://fdc.nal.usda.gov/api-docs.html)
- [Spoonacular API Docs](https://spoonacular.com/food-api/docs)
- [Edamam API](https://developer.edamam.com/)
- [Recipe Analysis Guide](./RECIPE_ANALYSIS_FRAMEWORK.md)
