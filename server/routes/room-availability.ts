import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { RoomAvailability } from '../../shared/types/calendar';

const repo = new Repository<RoomAvailability>();
export default createCRUD(repo);
