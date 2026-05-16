import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { CalendarEvent } from '../../shared/types/calendar';

const repo = new Repository<CalendarEvent>();
export default createCRUD(repo, { softDelete: true });
