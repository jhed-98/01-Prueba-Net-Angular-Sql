import { HttpErrorResponse } from '@angular/common/http';
import { formatHttpErrorMessage } from './http-error';

describe('formatHttpErrorMessage', () => {
  it('formatea error de servidor 500', () => {
    const err = new HttpErrorResponse({ status: 500 });
    expect(formatHttpErrorMessage(err)).toBe('Ha ocurrido un error en el servidor y no se pudo completar la solicitud.');
  });

  it('formatea error de conexion 0', () => {
    const err = new HttpErrorResponse({ status: 0 });
    expect(formatHttpErrorMessage(err)).toBe('No se pudo conectar con el servidor. Verifique que los servicios est??n activos.');
  });

  it('extrae mensaje de negocio 400', () => {
    const err = new HttpErrorResponse({ status: 400, error: { error: 'El nombre es obligatorio.' } });
    expect(formatHttpErrorMessage(err)).toBe('El nombre es obligatorio.');
  });
});
