# Echo AI Training System - Start Guide

## System Overview

The Echo Knowledge Universe is now fully integrated with OpenAI and Pinecone for collaborative training. Here's how to check all systems and start training.

## ✅ System Health Checks

### API Endpoints Available

1. **Quick Status Check**

   ```
   GET /api/health/status
   ```

   Returns overall system health with service details

2. **Readiness Check**

   ```
   GET /api/health/ready
   ```

   Quick boolean check if training is ready to start

3. **Detailed Verification**
   ```
   POST /api/health/verify
   ```
   Comprehensive system verification with all checks

### What Each Service Does

| Service      | Purpose                                                          | Status Check                       |
| ------------ | ---------------------------------------------------------------- | ---------------------------------- |
| **Echo**     | Core AI culinary assistant with knowledge engines                | Automatic - always operational     |
| **OpenAI**   | Powers collaborative training dialogues and knowledge extraction | API connectivity + key validation  |
| **Pinecone** | Stores learned knowledge as vectors for semantic search          | API connectivity + index readiness |

---

## 🚀 Starting the Training Process

### Via UI (Recommended)

1. **Navigate to Echo Training Dashboard**
   - Go to the Recipe section or find "Echo Training" in navigation
   - Click on the "System Status" tab

2. **Verify All Systems**
   - Review the System Status panel showing Echo, OpenAI, and Pinecone status
   - If all show "Operational" (green), you're ready
   - If any show "Error" (red), see troubleshooting below

3. **Start Training**
   - Click the "Start Training" button in the status panel, OR
   - Go to "Overview" tab and select a domain:
     - **Culinary Arts** - Recipe development, techniques, ingredients
     - **Financial Management** - Cost analysis, pricing, margins
     - **Hospitality & Service** - Banquet planning, guest experience
     - **Beverage Management** - Cocktails, wine pairing, cost
     - **Food Safety & Compliance** - Allergens, sanitation, regulations

### Via API (Advanced)

**Initialize Dialogue**

```bash
POST /api/echo-training/init-dialogue
Content-Type: application/json

{
  "domain": "culinary",
  "focusAreas": ["Recipe Development", "Cooking Techniques", "Ingredient Chemistry"]
}
```

**Response includes:**

- `dialogueId` - Unique training session ID
- Initial Echo message asking OpenAI to help fill knowledge gaps
- Identified knowledge gaps in the domain

---

## 📊 Training Workflow

### 1. Dialogue Initialization

- Echo identifies knowledge gaps in the selected domain
- System initializes a collaborative dialogue with OpenAI
- Echo asks questions to learn and fill gaps

### 2. Dialogue Turns

```bash
POST /api/echo-training/dialogue-turn
Content-Type: application/json

{
  "dialogueId": "dialogue-1234567890-xyz",
  "currentMessage": "What is sous vide and how do you use it in modern cuisine?",
  "domain": "culinary",
  "focusAreas": ["Cooking Techniques"]
}
```

Echo and OpenAI exchange messages, with OpenAI providing detailed responses and Echo asking follow-up questions.

### 3. Knowledge Capture

The system automatically:

- Extracts structured knowledge from OpenAI responses
- Tags knowledge with domain and type (recipe, technique, terminology, etc.)
- Calculates confidence scores
- Stores vectors in Pinecone for semantic search

**Manual Knowledge Save:**

```bash
POST /api/echo-training/save-learned-knowledge
Content-Type: application/json

{
  "dialogueId": "dialogue-1234567890-xyz",
  "knowledge": [
    {
      "id": "knowledge-123",
      "type": "technique",
      "title": "Sous Vide Cooking",
      "content": "A cooking method where food is vacuum-sealed and cooked in precise temperature water...",
      "domain": "culinary",
      "tags": ["cooking", "precision", "temperature"],
      "confidence": 0.92
    }
  ]
}
```

### 4. Dialogue Completion

```bash
POST /api/echo-training/complete-dialogue
Content-Type: application/json

{
  "dialogueId": "dialogue-1234567890-xyz",
  "dialogue": { ... }
}
```

Returns:

- Summary of learnings
- Key knowledge acquired
- Remaining gaps identified
- Recommended next training topics

---

## 🔧 Troubleshooting

### "OpenAI API Key not configured"

**Solution:**

1. Check that `OPENAI_API_KEY` environment variable is set
2. Verify the key is valid and has API credits at https://platform.openai.com
3. Restart the server if you just added the key

### "Pinecone API Key not configured"

**Solution:**

1. Check that `PINECONE_API_KEY` environment variable is set
2. Verify the key is valid at https://www.pinecone.io
3. The `echo-knowledge` index will be created automatically on first use

### "OpenAI API key is invalid (401 Unauthorized)"

**Solution:**

1. Verify your API key hasn't expired or been revoked
2. Check for typos in the API key
3. Ensure your OpenAI account has active billing
4. Generate a new API key at https://platform.openai.com/account/api-keys

### "Pinecone API key is invalid (401 Unauthorized)"

**Solution:**

1. Verify your API key is correct
2. Check that your Pinecone organization is active
3. Ensure the key has the correct permissions
4. Regenerate the API key if needed

### Training starts but no responses from OpenAI

**Possible causes:**

- OpenAI API rate limits reached
- Network connectivity issue
- OpenAI API is experiencing outages
- Model (gpt-4-turbo-preview) is not available in your region

**Solution:**

1. Wait a few minutes and try again
2. Check OpenAI status at https://status.openai.com
3. Verify internet connection
4. Check server logs for detailed error messages

### Knowledge not being stored in Pinecone

**Possible causes:**

- Pinecone index doesn't exist and wasn't created automatically
- API rate limits on Pinecone
- Embedding generation failed

**Solution:**

1. Verify Pinecone connection is working via health check
2. Check that `echo-knowledge` index exists in Pinecone console
3. Ensure you have index quota remaining
4. Check server logs for embedding errors

---

## 📈 Monitoring Training Progress

### Via UI

- **Training Tab**: Shows active session and statistics
- **Progress Tab**: Displays cumulative learning across all sessions
  - Total training sessions
  - Total knowledge items learned
  - Domains covered
  - Recently learned knowledge

### Via API

```bash
GET /api/health/status
```

Check the service status and use your application logs to monitor training sessions.

---

## 🎯 Best Practices

1. **Start with focused domains** - Begin with Culinary Arts to establish the core knowledge base
2. **Use meaningful focus areas** - Select 2-3 specific areas per training session
3. **Review learned knowledge** - Check the Progress tab to see what Echo has learned
4. **Train multiple domains** - Once culinary is strong, expand to Finance, Hospitality, etc.
5. **Iterative improvement** - Run multiple training sessions to deepen knowledge

---

## 📚 Available Training Domains

### Culinary Arts

**Focus Areas:** Recipe Development, Cooking Techniques, Ingredient Chemistry, Flavor Profiles

- Ideal for: Recipe development, menu innovation, cooking method mastery

### Financial Management

**Focus Areas:** Food Cost Analysis, Pricing Strategy, Profit Margins, Budget Planning

- Ideal for: Cost optimization, pricing decisions, financial planning

### Hospitality & Service

**Focus Areas:** Service Protocols, Banquet Planning, Guest Relations, Event Management

- Ideal for: Service excellence, event planning, guest satisfaction

### Beverage Management

**Focus Areas:** Cocktail Development, Wine Pairing, Beverage Cost, Service Techniques

- Ideal for: Bar operations, beverage program development, cost management

### Food Safety & Compliance

**Focus Areas:** Allergen Protocols, Food Safety, Sanitation Standards, Compliance

- Ideal for: Regulatory compliance, safety protocols, allergen management

---

## 🔐 Security Notes

- API keys are read from environment variables and never exposed in logs
- Knowledge is stored securely in Pinecone with user account isolation
- Training dialogues can include sensitive business information - use accordingly
- All API calls are HTTPS encrypted
- Pinecone data is encrypted at rest and in transit

---

## 🆘 Getting Help

1. **System Status Page** - Check `/api/health/status` for detailed diagnostics
2. **Server Logs** - Enable debug logging in your development environment
3. **API Documentation** - Review the endpoint descriptions in `server/routes/echo-openai-training.ts`
4. **Knowledge Base** - Check existing learned knowledge in the Progress tab
5. **Contact Support** - If issues persist, gather logs and service health details

---

## ✨ Example Training Session

1. **Initialize Training in Culinary Arts**
   - Focus on "Cooking Techniques" and "Ingredient Chemistry"

2. **Echo asks questions**
   - "What is the chemical process behind emulsification in sauces?"
   - "How do different cooking temperatures affect protein structure?"

3. **OpenAI provides detailed responses**
   - Explains molecular gastronomy concepts
   - Provides practical applications for recipes

4. **Knowledge is captured and stored**
   - Technique knowledge: emulsification process
   - Ingredient knowledge: protein behavior at different temperatures
   - Recipe associations: how to apply in contemporary cooking

5. **Echo learns and remembers**
   - When you later ask "how to make a stable hollandaise", Echo recalls the emulsification knowledge
   - Future training sessions build on this foundation

---

**System Status:** All systems operational ✓ Ready to start training!
