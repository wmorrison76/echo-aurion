import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { TimeClockEntry } from '../../shared/types/labor';

const repo = new Repository<TimeClockEntry>();
export default createCRUD(repo);
