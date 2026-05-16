import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { EventRoom } from '../../shared/types/beo';

const repo = new Repository<EventRoom>();
export default createCRUD(repo);
