import { Injectable, computed, signal } from '@angular/core';
import { environment, AppEnvironment } from '../../../environments/environment';

/**
 * Estructura global inyectable en tiempo de ejecución (ej. mediante Nginx / Kubernetes en Docker).
 * window.__env permite la filosofía "Build Once, Deploy Anywhere".
 */
declare global {
  interface Window {
    __env?: Partial<{
      WIN_APP_API_URL: string;
      WIN_APP_USE_MOCK: string | boolean;
      WIN_APP_ENV: string;
      WIN_APP_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
      [key: string]: unknown;
    }>;
  }
}

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  private readonly rawRuntime = typeof window !== 'undefined' ? window.__env : undefined;

  /**
   * Estado reactivo del entorno actual, combinando build-time y runtime overrides.
   */
  readonly config = signal<AppEnvironment>({
    production: this.resolveBoolean(this.rawRuntime?.WIN_APP_ENV ? this.rawRuntime.WIN_APP_ENV === 'production' : environment.production),
    env: (this.rawRuntime?.WIN_APP_ENV as string) || environment.env,
    apiUrl: (this.rawRuntime?.WIN_APP_API_URL as string) || environment.apiUrl,
    useMock: this.resolveBoolean(this.rawRuntime?.WIN_APP_USE_MOCK ?? environment.useMock),
    logLevel: (this.rawRuntime?.WIN_APP_LOG_LEVEL as AppEnvironment['logLevel']) || environment.logLevel,
    extra: environment.extra
  });

  /** URL base activa para llamadas HTTP hacia el BFF / Backend */
  readonly apiUrl = computed(() => this.config().apiUrl);

  /** Bandera activa que define si se usan Mocks en memoria o HTTP real */
  readonly useMock = computed(() => this.config().useMock);

  /** Nombre del ambiente actual (ej. 'development', 'staging', 'production') */
  readonly envName = computed(() => this.config().env);

  /** Indica si la aplicación está operando en modo productivo */
  readonly isProduction = computed(() => this.config().production);

  /** Nivel de logging configurado */
  readonly logLevel = computed(() => this.config().logLevel);

  private resolveBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
  }
}
