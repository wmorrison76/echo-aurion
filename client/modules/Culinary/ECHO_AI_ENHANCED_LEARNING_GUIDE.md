# Echo AI Enhanced Learning System

## Overview

Echo AI has been enhanced with a sophisticated learning system that captures diverse knowledge from OpenAI and enables collaborative training. The system now supports learning across multiple domains:

- **Culinary**: Recipes, techniques, ingredients, flavor profiles
- **Finance**: Cost analysis, pricing strategies, margins, budgeting
- **Hospitality**: Service protocols, banquet planning, guest relations
- **Beverage**: Cocktails, wine pairing, beverage cost management
- **Safety**: Allergen protocols, food safety, sanitation

## Key Features

### 1. **Automatic Knowledge Capture from OpenAI**

When Echo generates recipes or suggestions using OpenAI, the system automatically:

- Extracts structured knowledge from the response
- Identifies techniques, terminology, and best practices
- Stores this knowledge in the vector database
- Makes it available for future queries (no OpenAI notation)

**How it works:**

```
User Request → Echo searches knowledge base →
Low coverage → OpenAI generation →
Auto-capture of knowledge →
Store in Pinecone →
Future queries use learned knowledge
```

### 2. **Collaborative Training Mode**

Echo and OpenAI engage in a dialogue to collaboratively expand Echo's knowledge:

#### Starting a Training Session

Access the Echo Training Dashboard:

1. Navigate to the Echo Training Center
2. Select a domain (Culinary, Finance, Hospitality, etc.)
3. Choose focus areas within that domain
4. Click "Start Collaborative Training"

#### The Dialogue Process

1. **Echo Initiates**: Echo asks questions about the domain
2. **OpenAI Responds**: Provides detailed, practical information
3. **Knowledge Proposal**: The system extracts knowledge from responses
4. **User Confirmation**: You review and confirm what Echo learned
5. **Storage**: Confirmed knowledge is stored in Pinecone

#### Example Dialogue

```
Echo: "I need to understand advanced sauce preparation techniques.
       Can you explain the process of making a beurre blanc with temperature control?"

OpenAI: "Beurre blanc is an emulsified sauce made from butter, white wine,
         shallots, and cream. The key is temperature control - maintaining
         160-180°F to emulsify the butter without breaking it..."

System: [Extracts technique knowledge about beurre blanc]

User: [Reviews and confirms learning]

Storage: Technique stored → Available for future recipe suggestions
```

### 3. **Knowledge Types**

#### Recipe Knowledge

- Full recipe with ingredients and instructions
- Cuisine, complexity, prep/cook times
- Techniques and flavor profiles
- Service context (banquet, à la carte, etc.)

#### Technique Knowledge

- Step-by-step instructions
- Equipment needed
- Difficulty level
- Applications and variations
- Professional tips

#### Terminology

- Culinary terms and definitions
- Etymology and context
- Synonyms and examples
- Usage in professional settings

#### Financial Knowledge

- Cost analysis structures
- Pricing formulas
- Margin calculations
- Budgeting guidelines
- Benchmark data

#### Hospitality Knowledge

- Service protocols
- Banquet planning guidelines
- Guest interaction standards
- Event management best practices
- Service recovery techniques

#### Beverage Knowledge

- Cocktail recipes and techniques
- Wine and food pairing
- Beverage cost management
- Service standards

#### Safety Knowledge

- Allergen protocols
- Food safety procedures
- Sanitation standards
- Regulatory compliance

## API Endpoints

### Collaborative Training Endpoints

#### Initialize Dialogue

```bash
POST /api/echo-training/init-dialogue
{
  "domain": "culinary",
  "focusAreas": ["Recipe Development", "Cooking Techniques", "Flavor Profiles"]
}

Response:
{
  "success": true,
  "dialogue": {
    "id": "dialogue-...",
    "messages": [...],
    "knowledgeGaps": [...]
  }
}
```

#### Send Message in Dialogue

```bash
POST /api/echo-training/dialogue-turn
{
  "dialogueId": "dialogue-...",
  "currentMessage": "Can you explain sous vide cooking?",
  "domain": "culinary",
  "focusAreas": ["Cooking Techniques"]
}

Response:
{
  "success": true,
  "userMessage": {...},
  "openaiMessage": {...},
  "knowledgeExtracted": [...]
}
```

#### Save Learned Knowledge

```bash
POST /api/echo-training/save-learned-knowledge
{
  "dialogueId": "dialogue-...",
  "knowledge": [
    {
      "id": "knowledge-...",
      "type": "technique",
      "title": "Sous Vide Cooking",
      "content": "...",
      "tags": ["cooking", "precision"],
      "domain": "culinary"
    }
  ]
}

Response:
{
  "success": true,
  "stored": 5,
  "failed": 0
}
```

#### Auto-Capture Knowledge

```bash
POST /api/echo-training/auto-capture-openai-knowledge
{
  "openaiResponse": "Full OpenAI response text...",
  "context": "Recipe generation for banquet service",
  "domain": "culinary"
}

Response:
{
  "success": true,
  "extracted": 3,
  "knowledge": [...]
}
```

#### Complete Training Dialogue

```bash
POST /api/echo-training/complete-dialogue
{
  "dialogueId": "dialogue-...",
  "dialogue": {...}
}

Response:
{
  "success": true,
  "summary": "Key learnings from the training session..."
}
```

## Using the UI Components

### EchoOpenAITrainingMode Component

The collaborative training interface:

```tsx
import { EchoOpenAITrainingMode } from "@/components/EchoOpenAITrainingMode";

<EchoOpenAITrainingMode
  domain="culinary"
  focusAreas={["Recipe Development", "Cooking Techniques"]}
  onDialogueComplete={(summary) => console.log(summary)}
  onKnowledgeCapture={(knowledge) => console.log(knowledge)}
/>;
```

### EchoTrainingDashboard Component

The complete training dashboard:

```tsx
import { EchoTrainingDashboard } from "@/components/panels/EchoTrainingDashboard";

<EchoTrainingDashboard onRecipeImport={(recipes) => handleImport(recipes)} />;
```

## Hooks

### useEchoOpenAITraining Hook

```tsx
const {
  // State
  dialogue,
  messages,
  isActive,
  isLoading,
  learnedKnowledge,
  trainingSessions,

  // Methods
  initializeDialogue,
  sendMessage,
  saveLearning,
  completeDialogue,
  getSessionStats,
} = useEchoOpenAITraining();

// Initialize a dialogue
await initializeDialogue("culinary", ["Recipe Development"]);

// Send a message
await sendMessage("Explain beurre blanc", "culinary", ["Techniques"]);

// Save what was learned
await saveLearning([knowledgeItem]);

// Complete the session
const { session, summary } = await completeDialogue();

// Get current stats
const stats = getSessionStats();
```

## Knowledge Vector Service

The backend service manages knowledge storage and retrieval:

```typescript
import {
  storeKnowledgeVector,
  searchKnowledge,
  searchKnowledgeByDomain,
  identifyKnowledgeGaps,
  getKnowledgeStats,
} from "@/server/lib/knowledge-vector-service";

// Store knowledge
await storeKnowledgeVector(knowledgeItem);

// Search by query
const results = await searchKnowledge("beurre blanc", {
  topK: 10,
  type: "technique",
  domain: "culinary",
  minConfidence: 0.7,
});

// Search by domain
const allCulinary = await searchKnowledgeByDomain("culinary", 50);

// Identify gaps
const gaps = await identifyKnowledgeGaps("culinary", [
  "Techniques",
  "Ingredients",
  "Plating",
]);

// Get statistics
const stats = await getKnowledgeStats();
// { total: 150, byType: {...}, byDomain: {...}, bySource: {...} }
```

## Echo Chef Brain Integration

The enhanced Chef Brain leverages all knowledge types:

```typescript
import { EchoChefBrainKnowledgeIntegration } from "@/client/echo/brain/echoChefBrainKnowledgeIntegration";

// Enhance suggestions with related knowledge
const enhanced =
  await EchoChefBrainKnowledgeIntegration.enhanceSuggestionWithKnowledge(
    baseRecipeSuggestion,
    relatedKnowledge,
  );

// Get service context guidelines
const guidelines =
  await EchoChefBrainKnowledgeIntegration.getServiceContextKnowledge(
    "banquet_plated",
    guestCount,
  );

// Get cost analysis knowledge
const costAnalysis =
  await EchoChefBrainKnowledgeIntegration.getCostAnalysisKnowledge(
    recipeTitle,
    estimatedCost,
  );

// Build comprehensive recipe card
const card =
  await EchoChefBrainKnowledgeIntegration.buildComprehensiveRecipeCard(
    baseRecipe,
    relatedKnowledge,
    serviceContext,
    guestCount,
  );
```

## Knowledge Structure

Each knowledge item contains:

```typescript
interface BaseKnowledge {
  id: string;
  type: KnowledgeType; // recipe, technique, terminology, financial, hospitality, beverage, safety
  title: string;
  description: string;
  content: string;
  source?: string;
  sourceType: "openai" | "user_imported" | "user_trained";
  tags: string[];
  domain: "culinary" | "finance" | "hospitality" | "beverage" | "safety";
  createdAt: string;
  updatedAt: string;
  confidence?: number; // 0-1, how confident the knowledge is accurate
  relatedKnowledge?: string[]; // IDs of related knowledge items
}
```

## Workflow Examples

### Example 1: Learning a New Technique

1. **Start Training**: User clicks "Start Collaborative Training" for Culinary domain
2. **Focus Areas**: Select "Cooking Techniques"
3. **Dialogue**:
   - Echo asks: "Can you explain modern emulsification techniques?"
   - OpenAI responds with detailed explanation
   - System proposes technique knowledge items
4. **Confirmation**: User reviews and confirms learned techniques
5. **Storage**: Techniques stored in Pinecone
6. **Future Use**: Next time a recipe needs emulsification, Echo suggests the learned techniques

### Example 2: Financial Knowledge

1. **Start Training**: Select Finance domain
2. **Focus Areas**: Select "Food Cost Analysis", "Pricing Strategy"
3. **Dialogue**:
   - Echo asks: "How do we calculate ideal food cost percentage?"
   - OpenAI provides benchmarks and calculations
   - System extracts financial knowledge
4. **Application**: When Echo suggests recipes, it includes cost analysis based on learned formulas

### Example 3: Automatic Learning from Recipe Generation

1. User requests: "Generate a French plated appetizer for 100 guests"
2. Knowledge base has low coverage
3. Echo uses OpenAI to generate recipe
4. System automatically:
   - Extracts recipe knowledge
   - Identifies techniques used
   - Extracts terminology
   - Identifies cost considerations
   - Proposes hospitality guidelines
5. All knowledge stored for future use
6. Next similar request uses learned knowledge

## Best Practices

### For Training Sessions

1. **Focus on Gaps**: Start training in areas where Echo lacks knowledge
2. **Be Specific**: Ask detailed questions to get comprehensive responses
3. **Review Knowledge**: Always review proposed knowledge before confirming
4. **Build Progressively**: Start with foundational knowledge before advanced topics
5. **Link Concepts**: Train related concepts together (e.g., techniques and terminology)

### For Knowledge Quality

1. **Confidence Levels**: High-confidence items (0.8+) are used preferentially
2. **Regular Review**: Periodically review learned knowledge for accuracy
3. **Source Tracking**: All OpenAI-generated knowledge is marked with sourceType
4. **Validation**: Critical knowledge should be manually validated

### For Optimal Results

1. **Training Order**: Culinary → Finance → Hospitality → Safety
2. **Session Length**: 15-20 dialogue turns per session works well
3. **Topic Focus**: Stay focused on domain-specific topics within a session
4. **Regular Training**: Schedule regular training sessions (weekly/monthly)

## Troubleshooting

### Knowledge Not Being Captured

- Check if Pinecone API key is configured
- Verify the knowledge meets minimum quality threshold (confidence > 0.6)
- Check server logs for auto-capture errors

### Dialogue Not Responding

- Verify OpenAI API key is configured
- Check rate limits haven't been exceeded
- Ensure domain and focusAreas are valid

### Knowledge Not Appearing in Suggestions

- Verify knowledge was stored successfully
- Check confidence level (should be > 0.7 for suggestions)
- Ensure tags match query terms
- Check domain filter isn't excluding the knowledge

## Performance Considerations

- Embed text using OpenAI's embedding model (text-embedding-3-small)
- Store embeddings in Pinecone with metadata filtering
- Cache frequently accessed knowledge
- Batch store operations when possible
- Use confidence scoring to filter low-quality knowledge

## Security & Privacy

- All knowledge is stored server-side in Pinecone
- No knowledge is exposed through client without authentication
- OpenAI responses are processed server-side
- Knowledge source tracking enables attribution if needed
- Consider GDPR compliance for EU users

## Future Enhancements

- Multi-user knowledge collaboration
- Knowledge versioning and rollback
- Automated knowledge quality scoring
- Cross-domain knowledge relationships
- Knowledge export and sharing
- Custom training curricula
- Real-time collaborative training sessions

---

For questions or issues, contact the development team or open an issue in the project repository.
