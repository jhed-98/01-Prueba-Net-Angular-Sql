import { HttpErrorResponse } from '@angular/common/http';

export function formatHttpErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (!error) return 'Ha ocurrido un error inesperado.';

  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Verifique que los servicios est??n activos.';
    }
    if (error.status === 500) {
      return 'Ha ocurrido un error en el servidor y no se pudo completar la solicitud.';
    }
    if ([502, 503, 504].includes(error.status)) {
      return 'El servicio no se encuentra disponible en este momento. Intente nuevamente m??s tarde.';
    }
    if (error.error) {
      const errObj = error.error;
      if (typeof errObj === 'string' && errObj.trim().length > 0) return errObj;
      if (errObj.error && typeof errObj.error === 'string') return errObj.error;
      if (errObj.message && typeof errObj.message === 'string') return errObj.message;
      if (errObj.mensaje?.contenido) return errObj.mensaje.contenido;
    }
  }

  const errAny = error as Record<string, unknown>;
  if (errAny?.['message'] && typeof errAny['message'] === 'string') {
    return errAny['message'];
  }

  return 'Ha ocurrido un error inesperado. Intente nuevamente.';
}
