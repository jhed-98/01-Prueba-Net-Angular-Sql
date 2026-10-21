import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UiComboboxAsync } from './ui-combobox-async';
import type { UiSelectOption } from './ui-select';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Component({
  standalone: true,
  imports: [UiComboboxAsync, ReactiveFormsModule],
  template: `
    <app-ui-combobox-async
      apiUrl="/api/v1/productos/buscar"
      method="GET"
      queryParam="termino"
      [minChars]="2"
      [debounceTimeMs]="50"
      [value]="valorSeleccionado()"
      (valueChange)="valorSeleccionado.set($event)"
      (selectionChange)="opcionSeleccionada.set($event)"
      placeholder="Buscar producto remoto..."
      searchPlaceholder="Escriba c??digo o nombre..."
    />
  `,
})
class TestComboboxAsyncGetHost {
  readonly valorSeleccionado = signal<string | number>('');
  readonly opcionSeleccionada = signal<UiSelectOption | null>(null);
}

@Component({
  standalone: true,
  imports: [UiComboboxAsync, ReactiveFormsModule],
  template: `
    <app-ui-combobox-async
      apiUrl="/api/v1/clientes/filtrar"
      method="POST"
      queryParam="nombre"
      [extraParams]="{ estado: 'ACTIVO' }"
      [minChars]="2"
      [debounceTimeMs]="50"
      [value]="valorSeleccionado()"
      (valueChange)="valorSeleccionado.set($event)"
    />
  `,
})
class TestComboboxAsyncPostHost {
  readonly valorSeleccionado = signal<string | number>('');
}

@Component({
  standalone: true,
  imports: [UiComboboxAsync, ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <app-ui-combobox-async
        formControlName="productoId"
        apiUrl="/api/v1/articulos"
        [initialOption]="{ value: 50, label: 'Art??culo Inicial' }"
        placeholder="Seleccione art??culo"
      />
    </form>
  `,
})
class TestComboboxAsyncReactiveHost {
  readonly form = new FormGroup({
    productoId: new FormControl<number | null>(50),
  });
}

describe('UiComboboxAsync', () => {
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    TestBed.resetTestingModule();
  });

  it('renderiza con el placeholder inicial y sin opciones abiertas', () => {
    const fixture = TestBed.createComponent(TestComboboxAsyncGetHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Buscar producto remoto...');
  });

  it('ejecuta b??squeda HTTP GET con queryParam y debounce', async () => {
    const fixture = TestBed.createComponent(TestComboboxAsyncGetHost);
    fixture.detectChanges();

    // Abrir el combobox
    const trigger = fixture.nativeElement.querySelector('button');
    trigger.click();
    fixture.detectChanges();
    await delay(10);

    const searchInput = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    expect(searchInput).toBeTruthy();

    // Escribir menos de minChars (2) -> no debe disparar HTTP
    searchInput.value = 'a';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await delay(120);

    httpTesting.expectNone((req) => req.url.includes('/api/v1/productos/buscar'));

    // Escribir 2 o m??s caracteres -> dispara petici??n GET con ?termino=ultra
    searchInput.value = 'ultra';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await delay(120);

    const req = httpTesting.expectOne((r) => r.url.includes('/api/v1/productos/buscar'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('termino')).toBe('ultra');

    // Responder con array de datos
    req.flush([
      { id: 101, nombre: 'ULTRA Internet 300 Mbps' },
      { id: 102, nombre: 'ULTRA Internet 500 Mbps' },
    ]);
    fixture.detectChanges();

    const opciones = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(opciones.length).toBe(2);
    expect(opciones[0].textContent).toContain('ULTRA Internet 300 Mbps');

    // Seleccionar la primera opci??n
    (opciones[0] as HTMLElement).click();
    fixture.detectChanges();

    const host = fixture.componentInstance;
    expect(host.valorSeleccionado()).toBe(101);
    expect(host.opcionSeleccionada()?.label).toBe('ULTRA Internet 300 Mbps');
    expect(fixture.nativeElement.textContent).toContain('ULTRA Internet 300 Mbps');
  });

  it('ejecuta b??squeda HTTP POST enviando body estructurado con queryParam y extraParams', async () => {
    const fixture = TestBed.createComponent(TestComboboxAsyncPostHost);
    fixture.detectChanges();

    // Abrir combobox
    const trigger = fixture.nativeElement.querySelector('button');
    trigger.click();
    fixture.detectChanges();
    await delay(10);

    const searchInput = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    searchInput.value = 'Carlos';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await delay(120);

    const req = httpTesting.expectOne('/api/v1/clientes/filtrar');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nombre: 'Carlos',
      estado: 'ACTIVO',
    });

    // Responder con envoltorio com??n { data: [...] }
    req.flush({
      data: [{ value: 99, label: 'Carlos Meneses' }],
    });
    fixture.detectChanges();

    const opciones = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(opciones.length).toBe(1);
    expect(opciones[0].textContent).toContain('Carlos Meneses');

    (opciones[0] as HTMLElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.valorSeleccionado()).toBe(99);
  });

  it('muestra mensaje informativo cuando la b??squeda no devuelve resultados', async () => {
    const fixture = TestBed.createComponent(TestComboboxAsyncGetHost);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('button');
    trigger.click();
    fixture.detectChanges();
    await delay(10);

    const searchInput = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    searchInput.value = 'inexistente';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await delay(120);

    const req = httpTesting.expectOne((r) => r.url.includes('/api/v1/productos/buscar'));
    req.flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se encontraron resultados para "inexistente"');
  });

  it('maneja errores HTTP mostrando el mensaje de error sin quebrar la interfaz', async () => {
    const fixture = TestBed.createComponent(TestComboboxAsyncGetHost);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('button');
    trigger.click();
    fixture.detectChanges();
    await delay(10);

    const searchInput = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    searchInput.value = 'error-term';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await delay(120);

    const req = httpTesting.expectOne((r) => r.url.includes('/api/v1/productos/buscar'));
    req.flush({ message: 'Error interno en cat??logo' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.toLowerCase()).toContain('error');
  });

  it('se integra con Reactive Forms y muestra initialOption', () => {
    const fixture = TestBed.createComponent(TestComboboxAsyncReactiveHost);
    fixture.detectChanges();

    // Debe mostrar la etiqueta inicial antes de cualquier b??squeda remota
    expect(fixture.nativeElement.textContent).toContain('Art??culo Inicial');

    const host = fixture.componentInstance;
    expect(host.form.controls.productoId.value).toBe(50);
  });
});
