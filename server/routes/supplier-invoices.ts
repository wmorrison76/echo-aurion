import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { SupplierInvoice } from '../../shared/types/purchasing';

const repo = new Repository<SupplierInvoice>();
export default createCRUD(repo);
