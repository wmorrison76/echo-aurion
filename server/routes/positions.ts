import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { Position } from '../../shared/types/labor';

const repo = new Repository<Position>();
export default createCRUD(repo);
