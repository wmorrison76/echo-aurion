import express from 'express';
import cors from 'cors';
import echoRoutes from './routes/echoRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import versionRoutes from './routes/versionRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { loggerMiddleware } from './middleware/loggerMiddleware.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { PORT } from './config/envConfig.js';
import pastryRoutes from './routes/pastryRoutes.js';
import cakeDesignerRoutes from './routes/cakeDesignerRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(loggerMiddleware);

app.use('/api/cake-designer', authMiddleware, cakeDesignerRoutes);
app.use('/api/echo', echoRoutes);
app.use('/api/system', authMiddleware, systemRoutes);
app.use('/api/version', versionRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/pastry', authMiddleware, pastryRoutes);
app.listen(PORT || 3001, () => {
  console.log(`LUCCCA Core Backend running on port ${PORT || 3001}`);
});
