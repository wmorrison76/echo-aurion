import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { EventEquipment } from '../../shared/types/beo';

const repo = new Repository<EventEquipment>();
export default createCRUD(repo);
