# LUCCCA Sommelier Backend

**Section 1 Core Backend & Database Foundation**

## Modules

- **Wines API** (`/api/wines`) - CRUD operations for wine inventory
- **Inventory API** (`/api/inventory`) - Bottle lot tracking and management
- **Purchases API** (`/api/purchases`) - Purchase order history and costing
- **Pairing AI³ API** (`/api/pairing`) - Pairing evidence and recommendations
- **Auth API** (`/api/auth`) - User registration and authentication
- **Recipes** - Reference table for pairing vectors

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or pnpm

### Installation

1. Create `.env` file in backend root:

   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/sommelier_db
   PORT=8080
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Initialize database:

   ```bash
   npm run db:init
   ```

4. Seed initial data:

   ```bash
   npm run db:seed
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

The backend will start on `http://localhost:8080`

## API Endpoints

### Wines

- `GET /api/wines` - List all wines
- `GET /api/wines/:id` - Get single wine
- `POST /api/wines` - Create new wine
- `PATCH /api/wines/:id` - Update wine
- `DELETE /api/wines/:id` - Delete wine

### Inventory

- `GET /api/inventory` - List all lots
- `GET /api/inventory/:id` - Get single lot
- `POST /api/inventory` - Create new lot
- `PATCH /api/inventory/:id` - Update lot
- `DELETE /api/inventory/:id` - Delete lot

### Purchases

- `GET /api/purchases` - List all purchases
- `GET /api/purchases/:id` - Get single purchase
- `POST /api/purchases` - Record new purchase
- `PATCH /api/purchases/:id` - Update purchase

### Pairing

- `GET /api/pairing` - List all pairing evidence
- `GET /api/pairing/wine/:wine_id` - Get pairings for wine
- `GET /api/pairing/recipe/:recipe_id` - Get pairings for recipe
- `POST /api/pairing` - Create new pairing evidence
- `PATCH /api/pairing/:id` - Update pairing evidence

### Auth

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/user/:id` - Get user profile

## Database Schema

### wines

- Core wine inventory with flavor profiles, pricing, and metadata

### inventory_lots

- Bottle-level tracking with bin locations and quantities

### recipes

- Flavor vectors for pairing calculations

### pairing_evidence

- AI pairing scores and rationales

### users

- User accounts with roles and venue assignments

### purchases

- Purchase order history and supplier tracking

## Next Steps

Section 2 will introduce the **AI³ Pairing Engine** microservice with rule-based evaluation and learning feedback loop.
