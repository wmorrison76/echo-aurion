import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { ReceivingRecord } from '../../shared/types/purchasing';

const repo = new Repository<ReceivingRecord>();
export default createCRUD(repo);
