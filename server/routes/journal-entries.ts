import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { JournalEntry } from '../../shared/types/financial';

const repo = new Repository<JournalEntry>();
export default createCRUD(repo);
