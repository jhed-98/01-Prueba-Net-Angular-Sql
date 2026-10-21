import { TestBed } from '@angular/core/testing';
import { EnvironmentService } from './environment.service';
import { environment } from '../../../environments/environment';

describe('EnvironmentService', () => {
  let service: EnvironmentService;

  beforeEach(() => {
    delete (window as unknown as { __env?: unknown }).__env;
    TestBed.configureTestingModule({
      providers: [EnvironmentService]
    });
    service = TestBed.inject(EnvironmentService);
  });

  afterEach(() => {
    delete (window as unknown as { __env?: unknown }).__env;
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debe reflejar los valores por defecto de environment.ts', () => {
    expect(service.apiUrl()).toBe(environment.apiUrl);
    expect(service.useMock()).toBe(environment.useMock);
    expect(service.envName()).toBe(environment.env);
    expect(service.isProduction()).toBe(environment.production);
    expect(service.logLevel()).toBe(environment.logLevel);
  });

  it('debe dar prioridad a window.__env si existe en tiempo de ejecución (Docker / K8s)', () => {
    window.__env = {
      WIN_APP_API_URL: 'https://api.win.pe/bff',
      WIN_APP_USE_MOCK: false,
      WIN_APP_ENV: 'production',
      WIN_APP_LOG_LEVEL: 'warn'
    };

    const runtimeService = new EnvironmentService();
    expect(runtimeService.apiUrl()).toBe('https://api.win.pe/bff');
    expect(runtimeService.useMock()).toBe(false);
    expect(runtimeService.envName()).toBe('production');
    expect(runtimeService.isProduction()).toBe(true);
    expect(runtimeService.logLevel()).toBe('warn');
  });
});
