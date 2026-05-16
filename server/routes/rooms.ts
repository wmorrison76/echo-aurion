import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { Room } from '../../shared/types/beo';

const repo = new Repository<Room>();
export default createCRUD(repo);
