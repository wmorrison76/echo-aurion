import { getConfig } from './BanquetMenuBuilder.config';
import { getMongoClient } from './data/mongoClient';

export async function initializeBanquetMenuBuilder(): Promise<void> {
  const config = getConfig();
  try {
    const client = await getMongoClient();
    await client.db(config.mongodb.databaseName).command({ ping: 1 });
    // eslint-disable-next-line no-console
    console.info(
      `[BanquetMenuBuilder] Initialized successfully for property: ${config.propertyId}`,
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[BanquetMenuBuilder] Initialization failed:', err);
    throw err;
  }
}
