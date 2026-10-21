import { TestBed } from '@angular/core/testing';
import { TareasPage } from './tareas.page';
import { TAREA_SERVICE } from './services/tarea.service';
import { MockTareaService } from './services/tarea.mock';

describe('TareasPage', () => {
  let component: TareasPage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TareasPage]
    })
      .overrideComponent(TareasPage, {
        set: { providers: [{ provide: TAREA_SERVICE, useClass: MockTareaService }] }
      })
      .compileComponents();

    const fixture = TestBed.createComponent(TareasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe cargar la lista de tareas', async () => {
    await component.cargarTareas();
    expect(component.tareas().length).toBeGreaterThan(0);
  });

  it('no debe guardar con formulario inválido', async () => {
    await component.cargarTareas();
    const antes = component.tareas().length;
    component.abrirModalCreacion();
    await component.guardarNueva();
    expect(component.tareas().length).toBe(antes);
    expect(component.modalAbierto()).toBe(true);
  });

  it('debe crear tarea, refrescar lista y notificar éxito', async () => {
    await component.cargarTareas();
    const antes = component.tareas().length;
    component.abrirModalCreacion();
    component.form.patchValue({
      titulo: 'Nueva tarea',
      fechaInicio: '2026-10-25T09:00',
      categoriaId: 1
    });
    await component.guardarNueva();
    expect(component.tareas().length).toBe(antes + 1);
    expect(component.modalAbierto()).toBe(false);
    expect(component.toast().tone).toBe('success');
  });

  it('debe rechazar fechaFin menor a fechaInicio', () => {
    component.form.patchValue({ fechaInicio: '2026-10-25T09:00', fechaFin: '2026-10-24T09:00' });
    expect(component.form.hasError('fechaFinMenor')).toBe(true);
  });
});
