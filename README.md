# Plantilla Base Fullstack (.NET 10 + Angular 22 + SQL Server)
## Guía Rápida de Arquitectura y Conexión de Capas

Esta solución es la plantilla base para el desarrollo de la evaluación técnica práctica. Contiene la estructura lista y conectada para **Backend (.NET 10 + Dapper)** y **Frontend (Angular 22 Standalone)**.

---

## 🚀 1. Puesta en Marcha Rápida

### A. Backend (.NET 10 — Puerto `:5000`)
1. Ajusta tu cadena de conexión a SQL Server local en `backend/WinServices.Api.Api/appsettings.Development.json`:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Server=localhost;Database=PE_WINET_CRM;Trusted_Connection=True;TrustServerCertificate=True;"
   }
   ```
2. Compila y levanta el API:
   ```bash
   cd backend/WinServices.Api.Api
   dotnet run
   ```
   - El API escuchará en `http://localhost:5000` (Documentación interactiva en `http://localhost:5000/scalar/v1`).

### B. Frontend (Angular 22 — Puerto `:4200`)
1. En otra terminal, instala paquetes e inicia el servidor:
   ```bash
   cd frontend
   npm install
   npm start
   ```
   - La aplicación abrirá en `http://localhost:4200`.
   - El proxy (`proxy.conf.json`) ya redirige automáticamente toda llamada a `/api/*` hacia `http://localhost:5000`.

---

## 🧩 2. Cómo se Conectan las Capas en el Backend (.NET)

Puedes tomar como referencia directa los archivos de `Example` que ya están implementados y conectados en la solución:

| Paso | Capa / Proyecto | Ubicación y Propósito | Ejemplo de Referencia |
|:---:|---|---|---|
| **1** | **Domain** | `WinServices.Api.Domain/Entities/`<br>Entidades simples con propiedades C#. | `Entities/Example.cs` |
| **2** | **Application** | `WinServices.Api.Application/`<br>• `DTOs/`: Records de entrada/salida.<br>• `Validators/`: Reglas con FluentValidation.<br>• `Interfaces/`: Contratos `IXxxRepository` e `IXxxService`.<br>• `Services/`: Lógica de negocio que retorna `Result<T>`. | `DTOs/ExampleDto.cs`<br>`Validators/CreateExampleValidator.cs`<br>`Interfaces/IExampleRepository.cs`<br>`Services/ExampleService.cs` |
| **3** | **Infrastructure** | `WinServices.Api.Infrastructure/Repositories/`<br>Hereda de `BaseRepository` y usa `ConnectionFactory.CreateConnection()` con **Dapper** (`CommandType.StoredProcedure`). | `Repositories/ExampleRepository.cs` |
| **4** | **Registro DI** | Registra tus interfaces en:<br>• `Application/DependencyInjection.cs` (`AddScoped<IMiService, MiService>()`).<br>• `Infrastructure/DependencyInjection.cs` (`AddScoped<IMiRepository, MiRepository>()`). | Ambos `DependencyInjection.cs` |
| **5** | **Api** | `WinServices.Api.Api/Controllers/`<br>Controlador REST bajo la ruta `api/v{version:apiVersion}/...`. | `Controllers/ExampleController.cs` |

---

## 💻 3. Cómo se Conectan las Capas en el Frontend (Angular)

Puedes guiarte del módulo de referencia en `frontend/src/app/features/ejemplo/`:
1. **Modelos (`models/`)**: Interfaces TypeScript para tipar las respuestas del backend.
2. **Servicios (`services/`)**: Usa `HttpClient` apuntando a `/api/v1/<recurso>`.
3. **Página / Componente (`.page.ts` y `.page.html`)**: Componente Standalone usando `ReactiveFormsModule` (`FormGroup`) o Signals, registrado en `src/app/app.routes.ts`.
4. **UI Kit Disponible (`src/app/shared/`)**: Puedes utilizar los componentes compartidos (`<app-ui-table>`, `<app-ui-modal>`, `<app-ui-toast>`, `<app-ui-combobox-async>`, `[uiButton]`, `uiBadge`) o elementos HTML con clases Tailwind CSS.

---

## 📤 4. Entrega del Ejercicio

1. Sube tu solución a un **repositorio público en tu cuenta de GitHub** (incluyendo el script `.sql` que hayas creado).
2. Comparte el enlace de tu repositorio con el evaluador.
