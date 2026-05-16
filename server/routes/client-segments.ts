import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { ClientSegment } from '../../shared/types/crm';

const repo = new Repository<ClientSegment>();
export default createCRUD(repo);
