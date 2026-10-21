# win-services-web-template

> **Plantilla base oficial para aplicaciones Frontend en Angular 22** con arquitectura **Feature-Driven**, integraci??n con microservicios / BFF, componentes **Spartan UI / Tailwind CSS** y suite de pruebas **Vitest**.  
> **Plantilla Backend hermana:** `win-services-api-template` (.NET 10).

---

## Tabla de Contenidos
1. [Requisitos Previos e Instalaci??n del Entorno](#1-requisitos-previos-e-instalaci??n-del-entorno)
2. [Arquitectura del Proyecto (Feature-Driven)](#2-arquitectura-del-proyecto-feature-driven)
3. [Fundamentos y Est??ndares de C??digo Modern Angular](#3-fundamentos-y-est??ndares-de-c??digo-modern-angular)
4. [UI Kit y Componentes Spartan UI / Tailwind CSS](#4-ui-kit-y-componentes-spartan-ui--tailwind-css)
5. [Manejo de Errores y Notificaciones](#5-manejo-de-errores-y-notificaciones)
6. [Paso a Paso: C??mo Implementar una Nueva Funcionalidad](#6-paso-a-paso-c??mo-implementar-una-nueva-funcionalidad)
7. [Estrategia de Pruebas Unitarias con Vitest](#7-estrategia-de-pruebas-unitarias-con-vitest)
8. [Flujo de Trabajo Git y Buenas Pr??cticas](#8-flujo-de-trabajo-git-y-buenas-pr??cticas)
9. [Preguntas Frecuentes y Soluci??n de Problemas (Troubleshooting)](#9-preguntas-frecuentes-y-soluci??n-de-problemas-troubleshooting)

---

## 1. Requisitos Previos e Instalaci??n del Entorno

### 1.1 Requisitos del Sistema
- **Node.js:** Versi??n 24.x (Recomendado gestionar con `nvm`).
- **NPM:** 11.x o superior.
- **Git:** Configurado con credenciales de GitLab.
- **WSL 2 / Ubuntu** (si est??s en Windows).

### 1.2 Instalaci??n Paso a Paso

1. **Clonar el repositorio:**
   ```bash
   git clone https://gitlab.win.pe/win-services-stack/win-services-web-template.git <mi-proyecto>-web
   cd <mi-proyecto>-web
   ```

2. **Seleccionar la versi??n correcta de Node.js:**
   ```bash
   source ~/.nvm/nvm.sh
   nvm use 24
   ```

3. **Instalar dependencias:**
   ```bash
   npm install
   ```

4. **Configuración de Variables de Entorno (`.env`):**
   La plantilla utiliza un **enfoque híbrido seguro**. Al ejecutar `npm start` o `npm run env:sync`, se crea automáticamente el archivo `.env` a partir de `.env.example` si no existiera:
   ```bash
   # Sincronización manual (opcional, ocurre automáticamente en prestart/prebuild):
   npm run env:sync
   ```
   
   Variables principales disponibles en `.env`:
   ```ini
   # true = simulación reactiva en memoria (sin backend) | false = conexión BFF real
   WIN_APP_USE_MOCK=true
   # URL base para llamadas API
   WIN_APP_API_URL=/api/v1
   # Identificador de entorno (development, staging, production)
   WIN_APP_ENV=development
   # Nivel de logging
   WIN_APP_LOG_LEVEL=debug
   ```

   > [!WARNING]
   > **Seguridad Estricta:** El frontend corre en el navegador. **NUNCA** coloques contraseñas, secretos privados ni conexiones de BD en `.env`. Solo las variables con prefijo `WIN_APP_` son procesadas e inyectadas al bundle.

5. **Levantar el servidor de desarrollo:**
   ```bash
   npm start
   ```
   La aplicación estará disponible en: **`http://localhost:4200`**.

> [!TIP]
> Si configuras `WIN_APP_USE_MOCK=false`, Angular utilizará `proxy.conf.json` para redirigir `/api/*` hacia el BFF local (`http://localhost:8080`). Con `WIN_APP_USE_MOCK=true`, la aplicación operará de forma autónoma con datos simulados en memoria sin requerir ningún backend levantado.

### 1.3 Integraci??n con el Backend (Patr??n BFF ??? Backend for Frontend)

La plantilla est?? optimizada para comunicarse con un servicio **BFF (Backend for Frontend)** que act??a como orquestador y punto de entrada unificado, desacoplando el frontend de los microservicios core:

```text
????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
???         Frontend SPA (Angular 22 - Puerto :4200)         ???
????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
                             ??? HTTP (/api/v1/...) v??a proxy
                             ???
????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
???           BFF / API Gateway (.NET 10 - Puerto :8080)     ???
????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
             ???              ???              ???
             ???              ???              ???
       ???????????????????????????????????????  ???????????????????????????????????????  ???????????????????????????????????????
       ??? Servicio  ???  ??? Servicio  ???  ??? Servicio  ???
       ??? Clientes  ???  ??? Facturas  ???  ??? Cat??logos ???
       ???  (:5001)  ???  ???  (:5002)  ???  ???  (:5003)  ???
       ???????????????????????????????????????  ???????????????????????????????????????  ???????????????????????????????????????
```

**Ventajas del patr??n BFF en la arquitectura:**
* **Punto de entrada ??nico:** El frontend s??lo interact??a con la URL base del BFF, simplificando la configuraci??n de CORS y seguridad.
* **Seguridad centralizada:** El BFF valida tokens de sesi??n, aplica pol??ticas de autorizaci??n y sanitiza datos sensibles antes de enviarlos al cliente.
* **Agregaci??n y optimizaci??n:** Cuando una pantalla necesita informaci??n de m??ltiples servicios, el BFF realiza la orquestaci??n en una sola petici??n HTTP, minimizando la latencia de red.

---

## 2. Arquitectura del Proyecto (Feature-Driven)

El proyecto organiza el c??digo siguiendo una estructura **Feature-Driven**, agrupando componentes, servicios y modelos por dominio de negocio:

```text
src/
????????? app/
???   ????????? core/                      # Servicios transversales y singleton
???   ???   ????????? guards/                # Guards de autenticaci??n y permisos
???   ???   ????????? interceptors/          # Interceptores HTTP (headers, tokens)
???   ???   ????????? layout/                # Header, sidebar, shell principal
???   ???   ????????? mock/                  # Mock stores, semillas y datos simulados
???   ???   ????????? services/              # Auth, configuraci??n global, tema
???   ???   ????????? utils/                 # Utilidades globales (http-error, fechas, formatters)
???   ???
???   ????????? shared/                    # UI Kit y componentes reutilizables (Spartan UI)
???   ???   ????????? ui-button/             # Botones estilizados y variantes
???   ???   ????????? ui-input/              # Inputs de texto, n??mero, b??squeda
???   ???   ????????? ui-select/             # Selector desplegable animado con filtro
???   ???   ????????? ui-checkbox/           # Casillas de verificaci??n
???   ???   ????????? ui-modal/              # Ventana modal base flotante y responsiva
???   ???   ????????? ui-confirm/            # Di??logo emergente de confirmaci??n
???   ???   ????????? ui-toast/              # Notificaciones flotantes tipo toast
???   ???
???   ????????? models/                    # Tipos e interfaces de dominio compartidas
???   ???
???   ????????? features/                  # M??dulos y pantallas de negocio
???       ????????? dashboard/             # Pantalla de inicio / m??tricas
???       ????????? ejemplo/               # M??dulo de referencia con ciclo completo (Service/HTTP/Mock/Page/Spec)
```

---

## 3. Fundamentos y Est??ndares de C??digo Modern Angular

En esta plantilla aplicamos **las pr??cticas m??s modernas de Angular (versiones 19 a 22)**:

### 3.1 Standalone Components y Nuevo Control Flow
- Todos los componentes son `standalone: true`.
- **NO se usa** `*ngIf`, `*ngFor` ni `*ngSwitch`.
- Se utiliza la sintaxis moderna de bloques:
  ```html
  <!-- Condicionales -->
  @if (cargando()) {
    <p>Cargando datos...</p>
  } @else if (error()) {
    <p class="text-red-500">{{ error() }}</p>
  } @else {
    <!-- Bucles con track obligatorio -->
    @for (item of items(); track item.id; let idx = $index) {
      <div>{{ idx + 1 }} - {{ item.nombre }}</div>
    } @empty {
      <p>No hay registros disponibles.</p>
    }
  }
  ```

### 3.2 Angular Signals (Estado Reactivo)
Todo el estado local del componente se maneja con Signals:
```typescript
import { Component, signal, computed, effect } from '@angular/core';

@Component({ ... })
export class MiComponente {
  // Signal de estado mutable
  readonly busqueda = signal('');
  readonly elementos = signal<Item[]>([]);

  // Signal derivado (computed)
  readonly elementosFiltrados = computed(() => {
    const query = this.busqueda().toLowerCase().trim();
    if (!query) return this.elementos();
    return this.elementos().filter(item => item.nombre.toLowerCase().includes(query));
  });

  // M??todos para mutar el signal
  actualizarBusqueda(valor: string): void {
    this.busqueda.set(valor);
  }

  agregarElemento(nuevo: Item): void {
    this.elementos.update(prev => [...prev, nuevo]);
  }
}
```

### 3.3 Inyecci??n de Dependencias con `inject()`
En lugar de inyectar dependencias en el constructor, se usa `inject()` a nivel de campo:
```typescript
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EJEMPLO_SERVICE } from './services/ejemplo.service';

@Component({ ... })
export class EjemploPage {
  private readonly router = inject(Router);
  private readonly service = inject(EJEMPLO_SERVICE);
}
```

---

## 4. UI Kit y Componentes Spartan UI / Tailwind CSS

La plantilla cuenta con un conjunto de componentes base en `src/app/shared/` listos para usar:

| Componente | Selector | Prop??sito y Propiedades Principales |
|---|---|---|
| **UiButton** | `[uiButton]` / `<button uiButton>` | Bot??n estilizado. `variant`: `'primary' \| 'secondary' \| 'outline' \| 'destructive' \| 'ghost'`. `size`: `'sm' \| 'md' \| 'lg'`. |
| **UiInput** | `app-ui-input` | Campo de entrada con label flotante, helper text y estados de validaci??n. |
| **UiSelect** | `app-ui-select` | Selector flotante con dise??o Spartan UI / Shadcn. Soporta `[(value)]`, `[options]`, b??squeda y placeholder. |
| **UiModal** | `app-ui-modal` | Di??logo modal accesible. `[open]="boolean"`, `[title]="string"`, `(closed)="onClose()"`. |
| **UiToast** | `app-ui-toast` | Alertas emergentes en la esquina inferior. Tipos: `'success' \| 'error' \| 'info'`. |

---

## 5. Manejo de Errores y Notificaciones

Para garantizar que el usuario nunca reciba trazas de error t??cnicas o mensajes crudos del servidor, se utiliza la funci??n global `formatHttpErrorMessage` de `src/app/core/utils/http-error.ts`.

### Mapeo Est??ndar de Errores
- **Error 500:** *"Ha ocurrido un error en el servidor y no se pudo completar la solicitud."*
- **Error 502 / 503 / 504:** *"El servicio no se encuentra disponible en este momento. Intente nuevamente m??s tarde."*
- **Error 0 (Sin conexi??n):** *"No se pudo conectar con el servidor. Verifique que los servicios est??n activos."*
- **Error 400 / 422 (Validaci??n de negocio):** Extrae limpiamente el mensaje enviado por el backend (`resp.error`, `resp.message` o `resp.mensaje.contenido`).

---

## 6. Paso a Paso: C??mo Implementar una Nueva Funcionalidad

A continuaci??n se muestra el ciclo completo para crear una nueva funcionalidad:

### Paso 1: Definir los Modelos e Interfaces (`models/`)
```typescript
// src/app/features/nuevo-modulo/models/nuevo-modulo.model.ts
export interface ParametroConfiguracion {
  id: number;
  codigo: string;
  descripcion: string;
  activo: boolean;
}
```

### Paso 2: Crear el Contrato del Servicio (Interface + InjectionToken)
```typescript
import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ParametroConfiguracion } from '../models/nuevo-modulo.model';

export interface NuevoModuloService {
  listar(): Observable<ParametroConfiguracion[]>;
  crear(descripcion: string): Observable<ParametroConfiguracion>;
  eliminar(id: number): Observable<void>;
}

export const NUEVO_MODULO_SERVICE = new InjectionToken<NuevoModuloService>('NUEVO_MODULO_SERVICE');
```

### Paso 3: Implementar el Servicio HTTP Real
```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NuevoModuloService } from './nuevo-modulo.service';
import { ParametroConfiguracion } from '../models/nuevo-modulo.model';

@Injectable()
export class NuevoModuloHttpService implements NuevoModuloService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/configuraciones';

  listar(): Observable<ParametroConfiguracion[]> {
    return this.http.get<ParametroConfiguracion[]>(this.baseUrl);
  }

  crear(descripcion: string): Observable<ParametroConfiguracion> {
    return this.http.post<ParametroConfiguracion>(this.baseUrl, { descripcion });
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
```

### Paso 4: Implementar el Servicio Mock para Desarrollo y Pruebas
```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { mockResponse, MockStore } from '../../../core/mock/mock-api';
import { NuevoModuloService } from './nuevo-modulo.service';
import { ParametroConfiguracion } from '../models/nuevo-modulo.model';

@Injectable()
export class MockNuevoModuloService implements NuevoModuloService {
  private readonly store = new MockStore<ParametroConfiguracion>([
    { id: 1, codigo: 'CFG_01', descripcion: 'Par??metro inicial', activo: true }
  ]);

  listar(): Observable<ParametroConfiguracion[]> {
    return mockResponse(this.store.all().filter(item => item.activo));
  }

  crear(descripcion: string): Observable<ParametroConfiguracion> {
    const nuevo = this.store.insert({
      codigo: `CFG_${Date.now().toString().slice(-4)}`,
      descripcion,
      activo: true
    });
    return mockResponse(nuevo);
  }

  eliminar(id: number): Observable<void> {
    this.store.update(id, { activo: false });
    return mockResponse(undefined);
  }
}
```

### Paso 5: Crear el Componente de la Pantalla (Page / Modal)
```typescript
import { Component, inject, signal, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NUEVO_MODULO_SERVICE } from './services/nuevo-modulo.service';
import { ParametroConfiguracion } from './models/nuevo-modulo.model';
import { UiButton } from '../../shared/ui-button';
import { UiToast, ToastTone } from '../../shared/ui-toast';
import { formatHttpErrorMessage } from '../../core/utils/http-error';

@Component({
  selector: 'app-nuevo-modulo-page',
  standalone: true,
  imports: [UiButton, UiToast],
  template: `
    <div class="p-6">
      <h1 class="text-xl font-bold">Nuevo M??dulo</h1>
      <button uiButton (click)="cargarDatos()">Recargar</button>
    </div>
  `
})
export class NuevoModuloPage implements OnInit {
  private readonly service = inject(NUEVO_MODULO_SERVICE);
  readonly items = signal<ParametroConfiguracion[]>([]);

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    const data = await firstValueFrom(this.service.listar());
    this.items.set(data);
  }
}
```

---

## 7. Estrategia de Pruebas Unitarias con Vitest

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar en modo observador
npx vitest

# Ejecutar una prueba espec??fica
npx vitest src/app/features/ejemplo/ejemplo.page.spec.ts
```

---

## 8. Flujo de Trabajo Git y Buenas Pr??cticas

- **Idioma de los commits:** Siempre en **ESPA??OL** con Conventional Commits:
  - `feat(modulo): nueva funcionalidad`
  - `fix(modulo): correcci??n de error`
  - `docs(guia): actualizaci??n de documentaci??n`
  - `refactor(ui): reestructuraci??n de c??digo`
  - `test(modulo): nuevas pruebas unitarias`
- **Protocolo remoto:** Exclusivamente `https://` (`https://gitlab.win.pe/...`).
- **Flujo:** `git fetch` -> `git pull --rebase` -> `git add -A` -> `git commit` -> `git push`.

---

## 9. Preguntas Frecuentes y Soluci??n de Problemas (Troubleshooting)

- **CORS / 404:** Ejecuta siempre con `npm start` para habilitar el proxy hacia el BFF local (ej. `localhost:8080`).
- **Reactividad:** Utiliza `signal()` para estado mutable, `computed()` para valores calculados y `effect()` cuando requieras efectos secundarios.
