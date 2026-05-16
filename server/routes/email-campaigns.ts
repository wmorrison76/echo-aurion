import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { EmailCampaign } from '../../shared/types/crm';

const repo = new Repository<EmailCampaign>();
export default createCRUD(repo);
