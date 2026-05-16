import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { Resource } from '../../shared/types/calendar';

const repo = new Repository<Resource>();
export default createCRUD(repo);
