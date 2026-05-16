import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { ExternalFactor } from '../../shared/types/forecasting';

const repo = new Repository<ExternalFactor>();
export default createCRUD(repo);
