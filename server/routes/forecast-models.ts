import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { ForecastModel } from '../../shared/types/forecasting';

const repo = new Repository<ForecastModel>();
export default createCRUD(repo);
