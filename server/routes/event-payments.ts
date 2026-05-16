import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { EventPayment } from '../../shared/types/beo';

const repo = new Repository<EventPayment>();
export default createCRUD(repo);
