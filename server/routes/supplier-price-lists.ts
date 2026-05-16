import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { SupplierPriceList } from '../../shared/types/purchasing';

const repo = new Repository<SupplierPriceList>();
export default createCRUD(repo);
