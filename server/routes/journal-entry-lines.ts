import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { JournalEntryLine } from '../../shared/types/financial';

const repo = new Repository<JournalEntryLine>();
export default createCRUD(repo);
