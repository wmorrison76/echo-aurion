import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { BlackoutDate } from '../../shared/types/calendar';

const repo = new Repository<BlackoutDate>();
export default createCRUD(repo);
