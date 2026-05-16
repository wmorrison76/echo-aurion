import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { Equipment } from '../../shared/types/beo';

const repo = new Repository<Equipment>();
export default createCRUD(repo);
