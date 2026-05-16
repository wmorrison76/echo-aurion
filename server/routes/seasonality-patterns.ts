import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { SeasonalityPattern } from '../../shared/types/forecasting';

const repo = new Repository<SeasonalityPattern>();
export default createCRUD(repo);
