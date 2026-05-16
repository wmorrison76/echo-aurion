import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { EventStaff } from '../../shared/types/beo';

const repo = new Repository<EventStaff>();
export default createCRUD(repo);
