/**
 * Demo Property — Banquet Menu Seed Data
 *
 * Reference catalog used for BMB demos and integration tests. Each item
 * carries a description, dietary tags, and a pricing model so the canvas,
 * pricing engine, and dietary-coverage tools have realistic input.
 *
 * Coverage in this seed:
 * - Plated Breakfast components
 * - Continental & Wellness Breakfast Buffet items
 * - Hot Breakfast Buffet items
 * - Plated Lunch (3-course components)
 * - Reception Hors d'Oeuvres (cold + hot)
 * - Reception Display items (sushi, raw bar)
 * - Carving Stations
 * - Plated Dinner Appetizers, Entrees, Desserts
 * - Beverage Stations
 *
 * Dietary tag conventions:
 *   D = Dairy, G = Gluten, N = Nuts, S = Shellfish, VE = Vegan, VG = Vegetarian
 *
 * Pricing is per-guest, per-piece, per-dozen, or flat-fee depending on the
 * service style of the item.
 */

import { buildSeedItem, perGuest, perPiece, perDozen, flatFee } from './seedHelpers';
import type { PropertyItem } from '../../BanquetMenuBuilder.types';

const PROPERTY_ID = 'demo-property-001';

/**
 * Returns all demo seed items as PropertyItem inserts.
 * The seed runner inserts these into the database.
 */
export function getDemoPropertySeedItems(): Omit<
  PropertyItem,
  '_id' | 'createdAt' | 'updatedAt'
>[] {
  return [
    // =====================================================
    // BAKERY (Breakfast)
    // =====================================================
    buildSeedItem({
      name: 'Assorted Muffins, Croissants, Danishes',
      category: 'bakery',
      cuisineFamily: ['american', 'french'],
      descriptions: {
        short: 'Assortment of Muffins, Croissants, Danishes',
        standard: 'A fresh assortment of muffins, butter croissants, and Danish pastries',
        poetic: 'Morning warmth from the oven',
      },
      pricing: perGuest(15),
      dietaryTags: ['D', 'G', 'N', 'VG'],
      preparation: 'displayed',
      tags: ['breakfast', 'pastry'],
    }, PROPERTY_ID),

    // =====================================================
    // COLD SELECTION (Breakfast Plated)
    // =====================================================
    buildSeedItem({
      name: 'Seasonal Fruits and Berries with Greek Yogurt',
      category: 'cold-selection',
      cuisineFamily: ['american'],
      descriptions: {
        short: 'Seasonal Fruits and Berries, Greek Yogurt, Honey',
        poetic: 'A bright, clean start',
      },
      pricing: perGuest(12),
      dietaryTags: ['D', 'VG'],
      tags: ['breakfast', 'healthy'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Greek Yogurt Parfait',
      category: 'cold-selection',
      descriptions: {
        short: 'Greek Yogurt Parfait, Passion Fruit, Mango, Granola',
        poetic: 'Tropical mornings in a glass',
      },
      pricing: perGuest(14),
      dietaryTags: ['D', 'N', 'VG'],
      tags: ['breakfast', 'healthy'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Açaí Berry Bowl',
      category: 'cold-selection',
      cuisineFamily: ['brazilian', 'health-forward'],
      descriptions: {
        short: 'Açaí Berry Bowl, Berries, Banana, Coconut Flakes, Cocoa Nibs',
        poetic: 'Brazilian superfruit, Florida sunshine',
      },
      pricing: perGuest(16),
      dietaryTags: ['VE', 'VG'],
      tags: ['breakfast', 'wellness', 'vegan'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'House-Made Granola',
      category: 'cold-selection',
      descriptions: {
        short: 'House-Made Granola with Apples, Dates, Pecans, Cranberries',
      },
      pricing: perGuest(10),
      dietaryTags: ['N', 'VE', 'VG'],
      tags: ['breakfast'],
    }, PROPERTY_ID),

    // =====================================================
    // BREAKFAST ENTREES
    // =====================================================
    buildSeedItem({
      name: 'Egg White Frittata',
      category: 'hot-selection',
      descriptions: {
        short: 'Egg White Frittata with Peppers, Heirloom Tomatoes, Mushrooms',
        long: 'Egg White Frittata with Peppers, Heirloom Tomatoes, Mushrooms, Kale Citrus Salad, Turkey Bacon, Breakfast Potatoes',
      },
      pricing: perGuest(28),
      dietaryTags: ['VG'],
      preparation: 'chef-prepared',
      needsChef: true,
      tags: ['breakfast', 'protein-forward'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Buttermilk Pancakes',
      category: 'hot-selection',
      descriptions: {
        short: 'Buttermilk Pancakes with Chocolate Chips, Berries, Toasted Almonds, Maple Syrup',
        poetic: 'Sunday morning, every morning',
      },
      pricing: perGuest(22),
      dietaryTags: ['D', 'G', 'N', 'VG'],
      preparation: 'chef-prepared',
      needsChef: true,
      tags: ['breakfast', 'crowd-pleaser'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Avocado Toast with Poached Egg',
      category: 'hot-selection',
      descriptions: {
        short: 'Sourdough, Mashed Avocado, Vegan Feta, Pomegranate Seeds, Frisée',
        long: 'Avocado Toast, Poached Egg, Sourdough, Mashed Avocado, Vegan Feta Cheese, Pomegranate Seeds, Frisée Salad, Extra Virgin Olive Oil',
      },
      pricing: perGuest(24),
      dietaryTags: ['G', 'VG'],
      preparation: 'chef-prepared',
      needsChef: true,
      tags: ['breakfast', 'wellness', 'instagrammable'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Classic Eggs Benedict',
      category: 'hot-selection',
      descriptions: {
        short: 'English Muffin, Canadian Bacon, Hollandaise, Potato Hash',
        long: 'Classic Poached Eggs Benedict — English Muffin, Canadian Bacon, Hollandaise, Potato Hash',
      },
      pricing: perGuest(28),
      dietaryTags: ['D', 'G'],
      preparation: 'chef-prepared',
      needsChef: true,
      tags: ['breakfast', 'classic'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Smoked Salmon and Asparagus Quiche',
      category: 'hot-selection',
      descriptions: {
        short: 'Smoked Salmon and Asparagus Quiche, Citrus Goat Cheese',
      },
      pricing: perGuest(26),
      dietaryTags: ['D', 'G'],
      tags: ['breakfast', 'elegant'],
    }, PROPERTY_ID),

    // =====================================================
    // PLATED LUNCH SALADS
    // =====================================================
    buildSeedItem({
      name: 'Caesar Salad',
      category: 'salad',
      cuisineFamily: ['italian-american'],
      descriptions: {
        short: 'Baby Romaine, White Anchovy, Focaccia Croûtons, Parmigiano Reggiano',
        poetic: 'The classic, considered',
      },
      taglineOptions: ['Tradition Done Right', 'The Classic'],
      pricing: perGuest(18),
      dietaryTags: ['D', 'G'],
      networkArchetype: 'caesar-salad-traditional',
      tags: ['lunch', 'classic', 'crowd-pleaser'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Burrata Caprese',
      category: 'salad',
      cuisineFamily: ['italian'],
      descriptions: {
        short: 'Heirloom Tomatoes, Basil Pesto, Balsamic Pearls, Baby Arugula, EVOO',
        long: 'Heirloom Tomatoes, Basil Pesto, Balsamic Pearls, Baby Arugula, Extra Virgin Olive Oil',
        poetic: 'Italian summer, Florida soil',
      },
      taglineOptions: ['Coastal Italian', 'Garden Fresh'],
      pricing: perGuest(28),
      dietaryTags: ['D', 'N', 'VG'],
      tags: ['lunch', 'mediterranean', 'photogenic'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Little Gems with Grilled Peach',
      category: 'salad',
      descriptions: {
        short: 'Grilled Peach, Crumbled Feta, Candied Walnuts, Blueberries, Mint-Honey Yogurt',
        long: 'Little Gems lettuce with grilled peach, crumbled feta, candied walnuts, blueberries, mint-honey yogurt dressing',
      },
      pricing: perGuest(24),
      dietaryTags: ['D', 'N', 'VG'],
      tags: ['lunch', 'seasonal'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Beets & Berries',
      category: 'salad',
      descriptions: {
        short: 'Red and Golden Beets, Orange, Raspberry Compote, Goat Cheese, Hazelnuts',
        long: 'Red and Golden Beets, Orange, Raspberry Compote, Goat Cheese, Compressed Strawberry, Baby Arugula, Hazelnuts, Maple Vinaigrette',
      },
      pricing: perGuest(22),
      dietaryTags: ['D', 'N', 'VG'],
      tags: ['lunch', 'colorful'],
    }, PROPERTY_ID),

    // =====================================================
    // PLATED LUNCH ENTREES
    // =====================================================
    buildSeedItem({
      name: 'Airline Chicken Breast',
      category: 'entree',
      descriptions: {
        short: 'Garlic Potato Mash, Roasted Tomato, Asparagus, Yuzu Jus',
        poetic: 'Refined comfort',
      },
      pricing: perGuest(82),
      costBasis: 22,
      dietaryTags: ['D'],
      preparation: 'chef-prepared',
      tags: ['lunch', 'chicken'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Cabernet Braised Short Ribs',
      category: 'entree',
      descriptions: {
        short: 'Anson Mills Yellow Grits, Bacon, Mushroom Ragoût, Pickled Pearl Onions',
        long: 'Cabernet Braised Short Ribs with Anson Mills Yellow Grits, Bacon, Mushroom Ragoût, Citrus Pickled Pearl Onions, Red Wine Sauce',
        poetic: 'Slow-braised, deeply flavored',
      },
      pricing: perGuest(85),
      costBasis: 24,
      dietaryTags: ['D'],
      preparation: 'chef-prepared',
      tags: ['lunch', 'beef', 'comfort'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Pan Seared Sea Bass',
      category: 'entree',
      cuisineFamily: ['mediterranean', 'coastal'],
      descriptions: {
        short: 'Celeriac Purée, Wilted Kale, Snow Peas, Cilantro, Beurre Blanc',
        long: 'Pan Seared Sea Bass with Celeriac Purée, Wilted Kale, Snow Peas, Cilantro Salad, Beurre Blanc',
        poetic: 'A taste of the Mediterranean coast',
      },
      taglineOptions: ['Coastal Mediterranean', 'Sea-to-Table'],
      pricing: perGuest(98),
      costBasis: 28,
      dietaryTags: ['D'],
      preparation: 'chef-prepared',
      tags: ['lunch', 'dinner', 'seafood', 'mediterranean', 'signature'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Beef Tenderloin',
      category: 'entree',
      descriptions: {
        short: 'Sundried Tomato Risotto, Roasted Baby Leek, Crispy Prosciutto, Marsala',
        long: 'Beef Tenderloin with Sundried Tomato Risotto, Roasted Baby Leek, Crispy Prosciutto, Marsala Sauce',
      },
      pricing: perGuest(98),
      costBasis: 32,
      dietaryTags: ['D'],
      preparation: 'chef-prepared',
      tags: ['lunch', 'dinner', 'beef', 'premium'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Blackened Mahi-Mahi',
      category: 'entree',
      cuisineFamily: ['floridian', 'caribbean'],
      descriptions: {
        short: 'Potato and Plantain Mash, Pineapple Glaze, Coconut Sauce, Slaw, Chili Oil',
        long: 'Blackened Mahi-Mahi with Potato and Plantain Mash, Pineapple Glaze, Coconut Sauce, Peppers and Onion Slaw, Chili Oil',
        poetic: 'Florida coast, with fire',
      },
      pricing: perGuest(85),
      costBasis: 24,
      dietaryTags: ['D'],
      preparation: 'chef-prepared',
      tags: ['lunch', 'dinner', 'seafood', 'floridian'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Grilled Atlantic Salmon',
      category: 'entree',
      descriptions: {
        short: 'Farro Tabbouleh, Grilled Broccolini, Piquillo Pepper Coulis, Arugula-Fennel',
        long: 'Grilled Atlantic Salmon with Farro Tabbouleh, Grilled Broccolini, Piquillo Pepper Coulis, Arugula-Fennel Salad',
      },
      pricing: perGuest(82),
      costBasis: 22,
      dietaryTags: ['G'],
      preparation: 'chef-prepared',
      tags: ['lunch', 'dinner', 'seafood'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Stuffed Baby Eggplant',
      category: 'entree',
      cuisineFamily: ['mediterranean', 'middle-eastern'],
      descriptions: {
        short: 'Chickpeas Stew, Sesame-Garlic Purée, Mint Raita, Pomegranate Seeds',
        long: 'Stuffed Baby Eggplant with Chickpeas Stew, Creamy Sesame and Roasted Garlic Purée, Mint Raita, Pomegranate Seeds',
      },
      pricing: perGuest(70),
      costBasis: 12,
      dietaryTags: ['D', 'VG'],
      preparation: 'chef-prepared',
      tags: ['lunch', 'dinner', 'vegetarian', 'middle-eastern'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Vegetables Stack',
      category: 'entree',
      descriptions: {
        short: 'Portobello, Tofu, Grilled Vegetables, Hummus, Goat Cheese, Arugula',
        long: 'Vegetables Stack — Portobello, Tofu, Grilled Vegetables, Sun Dried Tomato, Hummus, Goat Cheese, Arugula',
      },
      pricing: perGuest(70),
      costBasis: 12,
      dietaryTags: ['D', 'VG'],
      preparation: 'chef-prepared',
      tags: ['lunch', 'dinner', 'vegetarian'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Jumbo Falafel',
      category: 'entree',
      cuisineFamily: ['middle-eastern'],
      descriptions: {
        short: 'Quinoa Tabbouleh, Hummus, Salted Baby Kale, Cherry Tomatoes, Tzatziki',
      },
      pricing: perGuest(70),
      costBasis: 12,
      dietaryTags: ['D', 'VG'],
      preparation: 'chef-prepared',
      tags: ['lunch', 'vegetarian', 'middle-eastern'],
    }, PROPERTY_ID),

    // =====================================================
    // RECEPTION HORS D'OEUVRES — COLD
    // =====================================================
    buildSeedItem({
      name: 'Beef Tartare',
      category: 'hors-doeuvre',
      descriptions: {
        short: 'Smoked Aioli, Soy Sauce, Yuzu, Crispy Onions',
        long: 'Beef Tartare with Smoked Aioli, Soy Sauce, Yuzu, Crispy Onions',
      },
      pricing: perPiece(14, 24),
      dietaryTags: ['G'],
      tags: ['reception', 'cold', 'butler-passed'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Duck Pâté on Brioche Toast',
      category: 'hors-doeuvre',
      cuisineFamily: ['french'],
      descriptions: {
        short: 'Brioche Toast, Dates Purée, Ham Powder',
      },
      pricing: perPiece(12, 24),
      dietaryTags: ['D', 'G'],
      tags: ['reception', 'cold'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: '"Al Pastor" Marinated Chicken Tartlet',
      category: 'hors-doeuvre',
      cuisineFamily: ['mexican'],
      descriptions: {
        short: 'Pineapple Cilantro Gel',
        long: '"Al Pastor" Marinated Chicken Tartlet with Pineapple Cilantro Gel',
      },
      pricing: perPiece(12, 24),
      dietaryTags: ['G'],
      tags: ['reception', 'cold', 'latin'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Maine Lobster Profiterole',
      category: 'hors-doeuvre',
      descriptions: {
        short: 'Avocado Purée, American Caviar',
        long: 'Maine Lobster Profiterole with Avocado Purée and American Caviar',
        poetic: 'Northeast coast, glistening',
      },
      pricing: perPiece(14, 24),
      dietaryTags: ['D', 'G', 'S'],
      tags: ['reception', 'cold', 'premium'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Crab Salad with Crème Fraîche',
      category: 'hors-doeuvre',
      descriptions: {
        short: 'Crème Fraîche, Preserved Lemon',
      },
      pricing: perPiece(14, 24),
      dietaryTags: ['G', 'S'],
      tags: ['reception', 'cold', 'seafood'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Tuna Tartare Cone',
      category: 'hors-doeuvre',
      descriptions: {
        short: 'Tamarind, Avocado Purée, Caviar',
      },
      pricing: perPiece(14, 24),
      dietaryTags: ['D', 'G'],
      tags: ['reception', 'cold', 'seafood'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Cured Salmon on Brioche',
      category: 'hors-doeuvre',
      descriptions: {
        short: 'Salmon Caviar, Citrus Mayonnaise, Brioche',
      },
      pricing: perPiece(12, 24),
      dietaryTags: ['D', 'G'],
      tags: ['reception', 'cold', 'seafood'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Rum Compressed Pineapple',
      category: 'hors-doeuvre',
      descriptions: {
        short: 'Coconut Crema',
      },
      pricing: perPiece(11, 24),
      dietaryTags: ['VE'],
      tags: ['reception', 'cold', 'tropical', 'vegan'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Mojito Melon',
      category: 'hors-doeuvre',
      descriptions: {
        short: 'Lime and Mint',
      },
      pricing: perPiece(11, 24),
      dietaryTags: ['VE'],
      tags: ['reception', 'cold', 'refreshing', 'vegan'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Cherry Tomato Stracciatella',
      category: 'hors-doeuvre',
      descriptions: {
        short: 'Cherry Tomato, Stracciatella, Balsamic',
      },
      pricing: perPiece(11, 24),
      dietaryTags: ['D'],
      tags: ['reception', 'cold', 'vegetarian'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Compressed Watermelon',
      category: 'hors-doeuvre',
      descriptions: {
        short: 'Balsamic, Mint',
      },
      pricing: perPiece(11, 24),
      dietaryTags: ['VE'],
      tags: ['reception', 'cold', 'refreshing', 'vegan'],
    }, PROPERTY_ID),

    // =====================================================
    // RECEPTION HORS D'OEUVRES — HOT
    // =====================================================
    buildSeedItem({
      name: 'Cilantro-Lime Barbecue Pulled Pork Arepa',
      category: 'hors-doeuvre',
      cuisineFamily: ['venezuelan', 'colombian'],
      descriptions: {
        short: 'Cotija Cheese Arepa',
        long: 'Cilantro-Lime Barbecue Pulled Pork on a Cotija Cheese Arepa',
      },
      pricing: perPiece(12, 24),
      dietaryTags: ['D'],
      tags: ['reception', 'hot', 'latin'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Short Ribs Croquette',
      category: 'hors-doeuvre',
      descriptions: {
        short: 'Truffle Mayonnaise',
      },
      pricing: perPiece(12, 24),
      dietaryTags: ['D', 'G'],
      tags: ['reception', 'hot'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Chicken Satay',
      category: 'hors-doeuvre',
      cuisineFamily: ['southeast-asian'],
      descriptions: {
        short: 'Teriyaki Sauce, Sesame',
      },
      pricing: perPiece(12, 24),
      dietaryTags: ['G'],
      tags: ['reception', 'hot', 'asian'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Mini Crab Cake',
      category: 'hors-doeuvre',
      descriptions: {
        short: 'Lemon Remoulade',
      },
      pricing: perPiece(13, 24),
      dietaryTags: ['G', 'S'],
      tags: ['reception', 'hot', 'seafood'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Coconut Shrimp',
      category: 'hors-doeuvre',
      descriptions: {
        short: 'Orange Ginger Sauce',
      },
      pricing: perPiece(13, 24),
      dietaryTags: ['G', 'S'],
      tags: ['reception', 'hot', 'tropical'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Beef Wellington',
      category: 'hors-doeuvre',
      descriptions: {
        short: 'Mini Beef Wellington',
        long: 'Mini Beef Wellington — beef tenderloin in puff pastry with mushroom duxelles',
      },
      pricing: perPiece(12, 24),
      dietaryTags: ['D', 'G'],
      tags: ['reception', 'hot', 'classic'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Portobello and Spinach Arancini',
      category: 'hors-doeuvre',
      cuisineFamily: ['italian'],
      descriptions: {
        short: 'Lemon Pesto Aioli',
      },
      pricing: perPiece(11, 24),
      dietaryTags: ['D', 'G', 'VG'],
      tags: ['reception', 'hot', 'vegetarian'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Fig and Brie Cheese Tart',
      category: 'hors-doeuvre',
      descriptions: {
        short: 'Fig and Brie Cheese Tart',
      },
      pricing: perPiece(11, 24),
      dietaryTags: ['D', 'G', 'VG'],
      tags: ['reception', 'hot', 'vegetarian'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Falafel with Yogurt Sauce',
      category: 'hors-doeuvre',
      cuisineFamily: ['middle-eastern'],
      descriptions: {
        short: 'Cucumber-Mint Yogurt Sauce',
      },
      pricing: perPiece(11, 24),
      dietaryTags: ['D', 'VG'],
      tags: ['reception', 'hot', 'vegetarian', 'middle-eastern'],
    }, PROPERTY_ID),

    // =====================================================
    // RECEPTION DISPLAY — SUSHI
    // =====================================================
    buildSeedItem({
      name: 'California Roll',
      category: 'sushi',
      cuisineFamily: ['japanese'],
      descriptions: {
        short: 'California Roll',
      },
      pricing: perPiece(11, 24),
      dietaryTags: ['S'],
      tags: ['reception', 'sushi'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Spicy Tuna Roll',
      category: 'sushi',
      cuisineFamily: ['japanese'],
      descriptions: {
        short: 'Spicy Tuna',
      },
      pricing: perPiece(15, 24),
      dietaryTags: [],
      tags: ['reception', 'sushi'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Vegetable Maki',
      category: 'sushi',
      cuisineFamily: ['japanese'],
      descriptions: {
        short: 'Vegetable Roll',
      },
      pricing: perPiece(10, 24),
      dietaryTags: ['VE'],
      tags: ['reception', 'sushi', 'vegan'],
    }, PROPERTY_ID),

    // =====================================================
    // CARVING STATIONS
    // =====================================================
    buildSeedItem({
      name: 'Beef Tenderloin (Carving)',
      category: 'carving',
      descriptions: {
        short: 'Whole Beef Tenderloin, Creamed Horseradish, Red Wine Jus',
        long: 'Carved beef tenderloin served with creamed horseradish and red wine jus, with assorted dinner rolls',
      },
      pricing: flatFee(750, '12-15'),
      costBasis: 200,
      dietaryTags: ['D'],
      preparation: 'carved',
      needsAttendant: true,
      minGuests: 12,
      tags: ['carving', 'reception', 'dinner', 'premium'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Argentinian Roasted Prime Rib (Carving)',
      category: 'carving',
      cuisineFamily: ['argentinian'],
      descriptions: {
        short: 'Chimichurri',
        long: 'Argentinian Roasted Prime Rib with Chimichurri',
      },
      pricing: flatFee(800, '25-30'),
      costBasis: 220,
      dietaryTags: [],
      preparation: 'carved',
      needsAttendant: true,
      minGuests: 25,
      tags: ['carving', 'reception', 'dinner', 'latin'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Herb Marinated Suckling Pig',
      category: 'carving',
      cuisineFamily: ['cuban'],
      descriptions: {
        short: 'Authentic Cuban Mojo',
      },
      pricing: flatFee(615, '40-45'),
      costBasis: 180,
      dietaryTags: [],
      preparation: 'carved',
      needsAttendant: true,
      minGuests: 40,
      tags: ['carving', 'reception', 'dinner', 'cuban', 'event-anchor'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Maple-Bourbon Basted Salmon (Carving)',
      category: 'carving',
      descriptions: {
        short: 'Apple Cider Jus',
      },
      pricing: flatFee(550, '12-15'),
      costBasis: 140,
      dietaryTags: [],
      preparation: 'carved',
      needsAttendant: true,
      minGuests: 12,
      tags: ['carving', 'reception', 'dinner', 'seafood'],
    }, PROPERTY_ID),

    // =====================================================
    // PLATED DINNER APPETIZERS
    // =====================================================
    buildSeedItem({
      name: 'South American Shrimp Cocktail',
      category: 'hors-doeuvre',
      cuisineFamily: ['latin', 'peruvian'],
      descriptions: {
        short: 'Red Onions, Tomatoes, Charred Corn, Coconut, Cucumber, Cilantro',
        long: 'South American Shrimp Cocktail with Red Onions, Tomatoes, Charred Corn, Coconut, Cucumber, and Cilantro',
        poetic: 'Lima market, plated',
      },
      pricing: perGuest(28),
      dietaryTags: ['S'],
      tags: ['dinner', 'appetizer', 'seafood', 'latin'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Cured Atlantic Salmon Tartare',
      category: 'hors-doeuvre',
      descriptions: {
        short: 'Orange Gelée, Yuzu Cream Cheese Quenelle, Dill Oil, Crispy Focaccia',
      },
      pricing: perGuest(28),
      dietaryTags: ['D', 'G'],
      tags: ['dinner', 'appetizer', 'seafood'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Beef Carpaccio',
      category: 'hors-doeuvre',
      cuisineFamily: ['italian'],
      descriptions: {
        short: 'Tomato-Shallot Vierge, Crispy Capers, 20-Year Balsamic, Parm Ganache',
        long: 'Beef Carpaccio with Tomato and Shallot Vierge, Crispy Capers, Lemon Oil, 20 Year-Aged Balsamic, Parmigiano Reggiano Ganache, Petite Sorrel',
      },
      pricing: perGuest(32),
      dietaryTags: ['D'],
      tags: ['dinner', 'appetizer', 'italian', 'premium'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Quinoa and Zucchini "Ravioli"',
      category: 'hors-doeuvre',
      cuisineFamily: ['mediterranean'],
      descriptions: {
        short: 'Butternut Squash Purée, "Ajo Blanco" Almond Soup, Vegan Feta',
        long: 'Quinoa and Zucchini "Ravioli" with Butternut Squash Purée, "Ajo Blanco" Grape and Toasted Almond Soup, Vegan Feta',
      },
      pricing: perGuest(25),
      dietaryTags: ['N', 'VE'],
      tags: ['dinner', 'appetizer', 'vegan', 'mediterranean'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Florida Crab Cake',
      category: 'hors-doeuvre',
      cuisineFamily: ['floridian'],
      descriptions: {
        short: 'Old Bay Remoulade, Spicy Tomato Stew, Charred Asparagus, Arugula',
        long: 'Florida Crab Cake with Old Bay Remoulade, Spicy Tomato Stew, Charred Asparagus, Arugula Salad',
        poetic: 'A taste of the Atlantic',
      },
      taglineOptions: ['Catch of the Coast', 'Atlantic Tradition'],
      pricing: perGuest(32),
      dietaryTags: ['D', 'S'],
      preparation: 'chef-prepared',
      networkArchetype: 'florida-crab-cake',
      tags: ['dinner', 'appetizer', 'seafood', 'floridian', 'signature'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Pan Seared Scallop',
      category: 'hors-doeuvre',
      descriptions: {
        short: 'Rosemary Cauliflower Purée, Pomegranate, Rhubarb-Orange Salad',
        long: 'Pan Seared Scallop with Rosemary Infused Cauliflower Purée, Dried Pomegranate Seeds, Rhubarb Orange Salad',
      },
      pricing: perGuest(30),
      dietaryTags: ['D', 'S'],
      preparation: 'chef-prepared',
      tags: ['dinner', 'appetizer', 'seafood', 'premium'],
    }, PROPERTY_ID),

    // =====================================================
    // PLATED DINNER ENTREES (LAND)
    // =====================================================
    buildSeedItem({
      name: 'Grilled Six-Ounce Beef Tenderloin',
      category: 'entree',
      descriptions: {
        short: 'Potato Gratin, Roasted Tomatoes, Asparagus, Wine Sauce',
      },
      pricing: perGuest(180),
      costBasis: 55,
      dietaryTags: ['D'],
      preparation: 'chef-prepared',
      tags: ['dinner', 'entree', 'beef', 'premium'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Rack of Lamb',
      category: 'entree',
      cuisineFamily: ['mediterranean'],
      descriptions: {
        short: 'Mustard-Mint Crust, Potato Cake, Pea Purée, Roasted Tomatoes',
        long: 'Rack of Lamb with Mustard, Mint Crust, Potato Cake, Green Pea Purée, Roasted Tomatoes, Rosemary Jus',
      },
      pricing: perGuest(195),
      costBasis: 60,
      dietaryTags: ['D', 'G'],
      preparation: 'chef-prepared',
      tags: ['dinner', 'entree', 'lamb', 'mediterranean', 'premium'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Duck Breast',
      category: 'entree',
      descriptions: {
        short: 'Pear-Cherry Purée, Vadouvan Carrots, Brussels Sprouts, Amarena Cherry Sauce',
        long: 'Duck Breast with Pear and Cherry Purée, Vadouvan Spiced Baby Carrots, Brussels Sprouts, Amarena Cherry Sauce',
      },
      pricing: perGuest(190),
      costBasis: 56,
      dietaryTags: ['D'],
      preparation: 'chef-prepared',
      tags: ['dinner', 'entree', 'duck', 'premium'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Braised Beef Short Rib',
      category: 'entree',
      descriptions: {
        short: 'Sweet Potato Mousseline, Shishito Peppers, Broccolini, Gremolata',
      },
      pricing: perGuest(185),
      costBasis: 50,
      dietaryTags: ['D'],
      preparation: 'chef-prepared',
      tags: ['dinner', 'entree', 'beef'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Bacon Wrapped Pork Tenderloin',
      category: 'entree',
      descriptions: {
        short: 'Root Vegetable Ragoût, Cipollini Onions, Celery Root Purée, Plum Sauce',
      },
      pricing: perGuest(175),
      costBasis: 48,
      dietaryTags: ['D'],
      preparation: 'chef-prepared',
      tags: ['dinner', 'entree', 'pork'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Goat Cheese & Pistachio Stuffed Chicken',
      category: 'entree',
      descriptions: {
        short: 'Potato Mousseline, Swiss Chard, Porcini, Port Wine Jus',
        long: 'Goat Cheese and Pistachio Stuffed Airline Chicken Breast with Creamy Potato Mousseline, Swiss Chard, Porcini Mushrooms, Port Wine Jus',
      },
      pricing: perGuest(170),
      costBasis: 44,
      dietaryTags: ['D', 'N'],
      preparation: 'chef-prepared',
      tags: ['dinner', 'entree', 'chicken'],
    }, PROPERTY_ID),

    // =====================================================
    // PLATED DINNER ENTREES (SEA)
    // =====================================================
    buildSeedItem({
      name: 'Atlantic Salmon (Plated Dinner)',
      category: 'entree',
      descriptions: {
        short: 'Purple Potato Purée, Pea Ragout, Roasted Asparagus, Tarragon Sauce',
      },
      pricing: perGuest(180),
      costBasis: 50,
      dietaryTags: ['D'],
      preparation: 'chef-prepared',
      tags: ['dinner', 'entree', 'seafood'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Broiled Mahi-Mahi',
      category: 'entree',
      cuisineFamily: ['floridian'],
      descriptions: {
        short: 'Citrus Risotto, Long Stemmed Artichoke, Baby Kale, Caviar Beurre Blanc',
      },
      pricing: perGuest(185),
      costBasis: 52,
      dietaryTags: ['D'],
      preparation: 'chef-prepared',
      tags: ['dinner', 'entree', 'seafood', 'floridian'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Sea Bass with Speck Crust',
      category: 'entree',
      cuisineFamily: ['italian', 'mediterranean'],
      descriptions: {
        short: 'Sardinian Clam Couscous, Snap Peas, Cioppino Stew',
        long: 'Sea Bass with Speck Crust, Sardinian Clam Couscous, Snap Peas, Cioppino Stew',
      },
      pricing: perGuest(205),
      costBasis: 64,
      dietaryTags: ['D', 'G', 'S'],
      preparation: 'chef-prepared',
      tags: ['dinner', 'entree', 'seafood', 'mediterranean', 'premium'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Persillade Crusted Grouper',
      category: 'entree',
      cuisineFamily: ['floridian'],
      descriptions: {
        short: 'Horseradish Potatoes, Confit Fennel, Spinach, Lemon Beurre Fondue',
        long: 'Persillade Crusted Grouper with Horseradish Creamed Potatoes, Confit Baby Fennel, Sautéed Spinach and Crimini Mushroom, Lemon Beurre Fondue',
      },
      pricing: perGuest(195),
      costBasis: 58,
      dietaryTags: ['D', 'G'],
      preparation: 'chef-prepared',
      tags: ['dinner', 'entree', 'seafood', 'floridian'],
    }, PROPERTY_ID),

    // =====================================================
    // DESSERTS
    // =====================================================
    buildSeedItem({
      name: 'Chocolate Tart',
      category: 'dessert',
      descriptions: {
        short: 'Gianduja Ganache, Passion Fruit Caramel, 70% Chocolate Cream',
      },
      pricing: perGuest(16),
      dietaryTags: ['D', 'G', 'N', 'VG'],
      tags: ['dessert', 'chocolate'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Key Lime Pie',
      category: 'dessert',
      cuisineFamily: ['floridian'],
      descriptions: {
        short: 'Graham Cracker, Meringue, Grapefruit',
        poetic: 'Florida in a slice',
      },
      pricing: perGuest(14),
      dietaryTags: ['D', 'G', 'VG'],
      tags: ['dessert', 'floridian', 'classic', 'signature'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Berry Cheesecake',
      category: 'dessert',
      descriptions: {
        short: 'Sablé, Lemon Confit Coulis, Strawberry-Mint Chutney',
      },
      pricing: perGuest(15),
      dietaryTags: ['D', 'G'],
      tags: ['dessert', 'classic'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Mille Feuille',
      category: 'dessert',
      cuisineFamily: ['french'],
      descriptions: {
        short: 'Pistachio Cream, Fresh Raspberry',
      },
      pricing: perGuest(16),
      dietaryTags: ['D', 'G', 'N'],
      tags: ['dessert', 'french'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Vanilla Mousse',
      category: 'dessert',
      descriptions: {
        short: 'Almond Moelleux Cake, Caramel Coulis',
      },
      pricing: perGuest(15),
      dietaryTags: ['D', 'G', 'N'],
      tags: ['dessert'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Vanilla Crème Brûlée',
      category: 'dessert',
      cuisineFamily: ['french'],
      descriptions: {
        short: 'Classic Vanilla Crème Brûlée',
      },
      pricing: perGuest(14),
      dietaryTags: ['D', 'VG'],
      tags: ['dessert', 'french', 'classic'],
    }, PROPERTY_ID),

    // =====================================================
    // BEVERAGES
    // =====================================================
    buildSeedItem({
      name: 'Selection of Coffee and Tea',
      category: 'beverage',
      descriptions: {
        short: 'Coffee, Decaffeinated Coffee, Selection of Teas',
        long: 'Local La Perla Coffee Roasters coffee, decaffeinated coffee, and selection of teas',
      },
      pricing: { kind: 'per-gallon', price: { amount: 150, currency: 'USD' } },
      dietaryTags: ['VE'],
      tags: ['beverage', 'breakfast', 'all-day'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Orange Juice',
      category: 'beverage',
      descriptions: {
        short: 'Fresh Orange Juice',
      },
      pricing: { kind: 'per-gallon', price: { amount: 130, currency: 'USD' } },
      dietaryTags: ['VE'],
      tags: ['beverage', 'breakfast'],
    }, PROPERTY_ID),

    buildSeedItem({
      name: 'Cold Pressed Detox Green Juice',
      category: 'beverage',
      descriptions: {
        short: 'Cold Pressed Detox Green Juice',
        poetic: 'Wellness in a glass',
      },
      pricing: { kind: 'per-gallon', price: { amount: 180, currency: 'USD' } },
      dietaryTags: ['VE'],
      tags: ['beverage', 'wellness'],
    }, PROPERTY_ID),
  ];
}
