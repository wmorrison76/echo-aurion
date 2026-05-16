import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { ResourceBooking } from '../../shared/types/calendar';

const repo = new Repository<ResourceBooking>();
export default createCRUD(repo);
