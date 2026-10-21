// ARCHIVO GENERADO AUTOMÁTICAMENTE POR scripts/sync-env.mjs
// NO EDITAR MANUALMENTE. Edite .env o .env.example y ejecute npm run env:sync

export interface AppEnvironment {
  readonly production: boolean;
  readonly env: string;
  readonly apiUrl: string;
  readonly useMock: boolean;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly extra: Readonly<Record<string, unknown>>;
}

export const environment: AppEnvironment = {
  production: false,
  env: 'development',
  apiUrl: '/api/v1',
  useMock: false,
  logLevel: 'debug',
  extra: {
  "WIN_APP_USE_MOCK": "false",
  "WIN_APP_API_URL": "/api/v1",
  "WIN_APP_ENV": "development",
  "WIN_APP_LOG_LEVEL": "debug"
}
};
