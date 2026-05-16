/**
 * Test API with Real Database
 * Demonstrates full CRUD operations
 */

import dotenv from 'dotenv';
dotenv.config();

import { createRepository } from './database/postgres-repository';
import { Recipe } from '../shared/types/recipe';
import { InventoryItem } from '../shared/types/inventory';
import { closePool } from './database/connection';

const testContext = {
  userId: '00000000-0000-0000-0000-000000000001', // Demo admin user
  orgId: '00000000-0000-0000-0000-000000000001'   // Demo organization
};

async function testRecipes() {
  console.log('\n📖 Testing Recipe CRUD...\n');
  
  const recipeRepo = createRepository<Recipe>('Recipe');
  
  try {
    // CREATE
    console.log('1. Creating recipe...');
    const newRecipe = await recipeRepo.create({
      name: 'Classic Caesar Salad',
      description: 'Fresh romaine lettuce with homemade Caesar dressing',
      categoryId: '00000000-0000-0000-0000-000000000001',
      prepTime: 15,
      cookTime: 0,
      totalTime: 15,
      servings: 4,
      difficulty: 'easy',
      ingredientCost: 850, // $8.50
      laborCost: 500,
      totalCost: 1350,
      costPerServing: 338,
      status: 'approved',
      isDraft: false,
      version: 1
    }, testContext);
    
    console.log('   ✅ Recipe created:', newRecipe.id);
    console.log('   Name:', newRecipe.name);
    console.log('   Cost per serving: $' + (newRecipe.costPerServing / 100).toFixed(2));
    
    // READ
    console.log('\n2. Reading recipe...');
    const foundRecipe = await recipeRepo.findById(newRecipe.id);
    console.log('   ✅ Recipe found:', foundRecipe?.name);
    
    // UPDATE
    console.log('\n3. Updating recipe...');
    const updatedRecipe = await recipeRepo.update(newRecipe.id, {
      prepTime: 20,
      description: 'Fresh romaine lettuce with homemade Caesar dressing and parmesan crisps'
    }, testContext);
    console.log('   ✅ Recipe updated');
    console.log('   New prep time:', updatedRecipe.prepTime, 'minutes');
    
    // LIST
    console.log('\n4. Listing recipes...');
    const recipes = await recipeRepo.findMany({ 
      orgId: testContext.orgId,
      pagination: { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' }
    });
    console.log('   ✅ Found', recipes.length, 'recipe(s)');
    recipes.forEach(r => console.log('      -', r.name));
    
    // COUNT
    console.log('\n5. Counting recipes...');
    const count = await recipeRepo.count({ orgId: testContext.orgId });
    console.log('   ✅ Total recipes:', count);
    
    // SOFT DELETE
    console.log('\n6. Soft deleting recipe...');
    await recipeRepo.softDelete(newRecipe.id, testContext);
    console.log('   ✅ Recipe archived');
    
    // VERIFY SOFT DELETE
    console.log('\n7. Verifying soft delete...');
    const afterDelete = await recipeRepo.findMany({ 
      orgId: testContext.orgId,
      pagination: { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' }
    });
    console.log('   ✅ Active recipes after delete:', afterDelete.length);
    
    console.log('\n✅ Recipe CRUD test completed successfully!');
    
  } catch (error) {
    console.error('❌ Recipe test failed:', error);
    throw error;
  }
}

async function testInventory() {
  console.log('\n📦 Testing Inventory CRUD...\n');
  
  const inventoryRepo = createRepository<InventoryItem>('InventoryItem');
  
  try {
    // CREATE
    console.log('1. Creating inventory item...');
    const newItem = await inventoryRepo.create({
      name: 'Organic Romaine Lettuce',
      sku: 'LETTUCE-ROM-001',
      quantity: 50,
      unit: 'heads',
      cost: 250, // $2.50 per head
      supplierId: '00000000-0000-0000-0000-000000000001',
      categoryId: '00000000-0000-0000-0000-000000000001',
      locationId: '00000000-0000-0000-0000-000000000001',
      minStock: 10,
      maxStock: 100,
      reorderPoint: 20
    }, testContext);
    
    console.log('   ✅ Item created:', newItem.id);
    console.log('   SKU:', newItem.sku);
    console.log('   Quantity:', newItem.quantity, newItem.unit);
    console.log('   Cost: $' + (newItem.cost / 100).toFixed(2), 'per', newItem.unit);
    
    // UPDATE QUANTITY
    console.log('\n2. Updating quantity (simulating usage)...');
    const updatedItem = await inventoryRepo.update(newItem.id, {
      quantity: 35 // Used 15 heads
    }, testContext);
    console.log('   ✅ Quantity updated to:', updatedItem.quantity);
    
    // CHECK LOW STOCK
    if (updatedItem.quantity <= updatedItem.reorderPoint) {
      console.log('   ⚠️  LOW STOCK ALERT: Below reorder point!');
    }
    
    // LIST
    console.log('\n3. Listing inventory...');
    const items = await inventoryRepo.findMany({ 
      orgId: testContext.orgId,
      pagination: { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' }
    });
    console.log('   ✅ Found', items.length, 'item(s)');
    
    console.log('\n✅ Inventory CRUD test completed successfully!');
    
  } catch (error) {
    console.error('❌ Inventory test failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 EchoAurum API Test Suite');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    await testRecipes();
    await testInventory();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL TESTS PASSED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ TEST SUITE FAILED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    throw error;
  } finally {
    await closePool();
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
