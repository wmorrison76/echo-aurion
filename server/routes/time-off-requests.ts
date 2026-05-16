import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { TimeOffRequest } from '../../shared/types/labor';

const repo = new Repository<TimeOffRequest>();
export default createCRUD(repo);
