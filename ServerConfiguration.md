
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

   * SE CAMBIARA EL PUERTO 5000 A 5080 DEBIDO Q ESE PUERTO ESTA UTILIZADO Edward\backend\WinServices.Api.Api\appsettings.Development.json

### B. Frontend (Angular 22 — Puerto `:4200`)
1. En otra terminal, instala paquetes e inicia el servidor:
   ```bash
   cd frontend
   npm install
   npm start
   ```
   
   * SE DEBE CONFIGURAR EL [TAILWIND](https://tailwindcss.com/docs/installation/framework-guides/angular)
   * Configurar el ..\Edward\frontend\src\app\app.config.ts -- provideZonelessChangeDetection(),

   - La aplicación abrirá en `http://localhost:4200`.
   - El proxy (`proxy.conf.json`) ya redirige automáticamente toda llamada a `/api/*` hacia `http://localhost:5000`.


---