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

---

- Se modificó el puerto del backend `5000` por `5080` debido a un conflicto. `backend\WinServices.Api.Api\appsettings.Development.json`
- La conexion del `SQLSERVER` nos brinda `DEMO\SQLEXPRESS`, pero el archivo donde se modifico el puerto da error de sintaxi. Solución usar doble barra invertida `DEMO\\SQLEXPRESS`

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

Antes de levantar el proyecto de Angular considera estos puntos:

- Completar la integración de [Tailwind para Angular](https://tailwindcss.com/docs/installation/framework-guides/angular).
- Configurar el `frontend\src\app\app.config.ts` con `provideZonelessChangeDetection(),`
- Debio al cambio del puerto en el backend, se actualizó los puertos `5080` en `frontend\proxy.conf.json`
