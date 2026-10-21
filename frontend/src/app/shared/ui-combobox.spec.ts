import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { UiCombobox } from './ui-combobox';
import type { UiSelectOption } from './ui-select';

@Component({
  standalone: true,
  imports: [UiCombobox, ReactiveFormsModule],
  template: `
    <app-ui-combobox
      [options]="opciones"
      [value]="valorSeleccionado()"
      (valueChange)="valorSeleccionado.set($event)"
      placeholder="Seleccione un producto"
      searchPlaceholder="Buscar producto..."
    />
  `,
})
class TestComboboxHost {
  readonly opciones: UiSelectOption[] = [
    { value: '', label: 'Seleccione producto' },
    { value: 101, label: 'ULTRA Internet 300 Mbps' },
    { value: 102, label: 'ULTRA Internet 500 Mbps' },
    { value: 103, label: 'DGO Plan B??sico' },
  ];
  readonly valorSeleccionado = signal<string | number>('');
}

@Component({
  standalone: true,
  imports: [UiCombobox, ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <app-ui-combobox
        formControlName="productoId"
        [options]="opciones"
        placeholder="Seleccione producto"
      />
    </form>
  `,
})
class TestComboboxReactiveHost {
  readonly opciones: UiSelectOption[] = [
    { value: 1, label: 'Producto A' },
    { value: 2, label: 'Producto B' },
  ];
  readonly form = new FormGroup({
    productoId: new FormControl<number | null>(null),
  });
}

describe('UiCombobox', () => {
  it('renderiza con el placeholder inicial', async () => {
    await TestBed.configureTestingModule({
      imports: [TestComboboxHost],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestComboboxHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Seleccione un producto');
  });

  it('permite buscar y filtrar interactivamente opciones', async () => {
    await TestBed.configureTestingModule({
      imports: [TestComboboxHost],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestComboboxHost);
    fixture.detectChanges();

    // Abrir el combobox
    const trigger = fixture.nativeElement.querySelector('button');
    trigger.click();
    fixture.detectChanges();

    // Comprobar que el input de b??squeda existe
    const searchInput = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    expect(searchInput).toBeTruthy();
    expect(searchInput.placeholder).toBe('Buscar producto...');

    // Filtrar por "dgo"
    searchInput.value = 'dgo';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const opciones = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(opciones.length).toBe(1);
    expect(opciones[0].textContent).toContain('DGO Plan B??sico');
  });

  it('funciona correctamente con Reactive Forms ControlValueAccessor', async () => {
    await TestBed.configureTestingModule({
      imports: [TestComboboxReactiveHost],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestComboboxReactiveHost);
    fixture.detectChanges();

    const host = fixture.componentInstance;
    host.form.controls.productoId.setValue(2);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Producto B');
  });
});
