/**
 * Banquet Menu Builder — Configuration
 *
 * Reads environment variables and exposes a typed config object.
 * Throws on startup if required env vars are missing — fail fast.
 */

interface BanquetModuleConfig {
  mongodb: {
    connectionString: string;
    databaseName: string;
    maxPoolSize: number;
    minPoolSize: number;
  };
  propertyId: string;
  network: {
    contributionEnabled: boolean;
  };
  echo: {
    proxyUrl: string | null;
  };
  featureFlags: {
    enableVectorSearch: boolean;
    enableNetworkIntelligence: boolean;
    enableEcho: boolean;
  };
}

function readEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(
      `[BanquetMenuBuilder] Missing required environment variable: ${key}\n` +
      `See .env.example in src/modules/MaestroBqts/BanquetMenuBuilder/`
    );
  }
  return value;
}

function readEnvNumber(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(`[BanquetMenuBuilder] Invalid number for env var ${key}: ${raw}`);
  }
  return parsed;
}

function readEnvBoolean(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return defaultValue;
  return raw.toLowerCase() === 'true' || raw === '1';
}

let cachedConfig: BanquetModuleConfig | null = null;

export function getConfig(): BanquetModuleConfig {
  if (cachedConfig) return cachedConfig;

  cachedConfig = {
    mongodb: {
      connectionString: readEnv('LUCCCA_MONGO_CONNECTION_STRING'),
      databaseName: readEnv('LUCCCA_MONGO_DATABASE_NAME', 'luccca_banquet'),
      maxPoolSize: readEnvNumber('LUCCCA_MONGO_MAX_POOL_SIZE', 20),
      minPoolSize: readEnvNumber('LUCCCA_MONGO_MIN_POOL_SIZE', 5),
    },
    propertyId: readEnv('LUCCCA_PROPERTY_ID'),
    network: {
      contributionEnabled: readEnvBoolean('LUCCCA_NETWORK_CONTRIBUTION_ENABLED', false),
    },
    echo: {
      proxyUrl: process.env.LUCCCA_ECHO_PROXY_URL ?? null,
    },
    featureFlags: {
      // Package 4 will enable these when ready
      enableVectorSearch: false,
      enableNetworkIntelligence: false,
      enableEcho: false,
    },
  };

  return cachedConfig;
}

// Reset cached config (useful for tests)
export function _resetConfigForTesting(): void {
  cachedConfig = null;
}
