interface AppConfig {
  apiBaseUrl: string;
  appName: string;
  enablePwa: boolean;
  environment: 'development' | 'staging' | 'production';
}

function getConfig(): AppConfig {
  return {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
    appName: import.meta.env.VITE_APP_NAME || 'AUCARE',
    enablePwa: import.meta.env.VITE_ENABLE_PWA === 'true',
    environment: (import.meta.env.MODE as AppConfig['environment']) || 'development',
  };
}

export const config = getConfig();

export function isDevelopment(): boolean {
  return config.environment === 'development';
}

export function isProduction(): boolean {
  return config.environment === 'production';
}
