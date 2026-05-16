import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { EventInvoice } from '../../shared/types/beo';

const repo = new Repository<EventInvoice>();
export default createCRUD(repo);
