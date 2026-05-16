import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { DemandForecast } from '../../shared/types/forecasting';

const repo = new Repository<DemandForecast>();
export default createCRUD(repo);
