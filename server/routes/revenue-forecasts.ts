import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { RevenueForecast } from '../../shared/types/forecasting';

const repo = new Repository<RevenueForecast>();
export default createCRUD(repo);
