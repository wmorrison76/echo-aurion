import { createCRUD } from '../factories/crud-router';
import { createRepository } from '../database/postgres-repository';
import type { Recipe } from '../../shared/types/recipe';
import { recipeCreateSchema, recipeUpdateSchema } from '../../shared/validation/recipe.schemas';

const recipeRepo = createRepository<Recipe>('Recipe');

export default createCRUD(recipeRepo, {
  softDelete: true,
  validate: {
    create: recipeCreateSchema,
    update: recipeUpdateSchema
  }
});
