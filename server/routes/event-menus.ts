import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { EventMenu } from '../../shared/types/beo';

const repo = new Repository<EventMenu>();
export default createCRUD(repo, { softDelete: true });
