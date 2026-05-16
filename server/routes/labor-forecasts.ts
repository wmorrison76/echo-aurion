import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { LaborForecast } from '../../shared/types/forecasting';

const repo = new Repository<LaborForecast>();
export default createCRUD(repo);
