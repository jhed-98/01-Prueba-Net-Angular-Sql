import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const envExamplePath = path.join(rootDir, '.env.example');
const envPath = path.join(rootDir, '.env');
const environmentsDir = path.join(rootDir, 'src', 'environments');
const targetEnvFile = path.join(environmentsDir, 'environment.ts');
const targetDevEnvFile = path.join(environmentsDir, 'environment.development.ts');

// 1. Asegurar existencia de .env a partir de .env.example
if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('[sync-env] Archivo .env no encontrado. Copiando desde .env.example automáticamente...');
    fs.copyFileSync(envExamplePath, envPath);
  } else {
    console.warn('[sync-env] ADVERTENCIA: No se encontró .env ni .env.example');
  }
}

// 2. Parser ligero de archivos de configuración (.env)
function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIdx = trimmed.indexOf('=');
    if (equalsIdx === -1) continue;

    const rawKey = trimmed.slice(0, equalsIdx).trim();
    let rawVal = trimmed.slice(equalsIdx + 1).trim();

    // Remover comillas envolventes si existen
    if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
      rawVal = rawVal.slice(1, -1);
    }

    result[rawKey] = rawVal;
  }
  return result;
}

const rawEnv = parseEnv(envPath);

// 3. Filtrar estrictamente solo variables con prefijo WIN_APP_
// PRINCIPIO DE SEGURIDAD: Nunca exponer variables sin este prefijo al bundle frontend
const filteredEnv = {};
for (const [key, value] of Object.entries(rawEnv)) {
  if (key.startsWith('WIN_APP_')) {
    filteredEnv[key] = value;
  }
}

// Convertir valores primitivos
function castValue(val) {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (!isNaN(val) && val.trim() !== '') return Number(val);
  return val;
}

const useMock = castValue(filteredEnv.WIN_APP_USE_MOCK ?? 'true');
const apiUrl = filteredEnv.WIN_APP_API_URL ?? '/api/v1';
const appEnv = filteredEnv.WIN_APP_ENV ?? 'development';
const logLevel = filteredEnv.WIN_APP_LOG_LEVEL ?? 'debug';
const isProduction = appEnv === 'production';

// 4. Generar archivo TypeScript con interfaz y tipado estricto
const tsContent = `// ARCHIVO GENERADO AUTOMÁTICAMENTE POR scripts/sync-env.mjs
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
  production: ${isProduction},
  env: '${appEnv}',
  apiUrl: '${apiUrl}',
  useMock: ${useMock},
  logLevel: '${logLevel}',
  extra: ${JSON.stringify(filteredEnv, null, 2)}
};
`;

if (!fs.existsSync(environmentsDir)) {
  fs.mkdirSync(environmentsDir, { recursive: true });
}

// Escribir environment.ts (usado en prod / default) y environment.development.ts (usado en dev)
fs.writeFileSync(targetEnvFile, tsContent, 'utf-8');
fs.writeFileSync(targetDevEnvFile, tsContent, 'utf-8');

console.log(`[sync-env] ✅ Variables sincronizadas con éxito:`);
console.log(`           - Environment: ${appEnv} (production: ${isProduction})`);
console.log(`           - API Base URL: ${apiUrl}`);
console.log(`           - Use Mock:    ${useMock}`);
console.log(`           - Log Level:   ${logLevel}`);
