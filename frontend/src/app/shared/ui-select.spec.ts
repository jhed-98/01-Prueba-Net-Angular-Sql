import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UiSelect, type UiSelectOption } from './ui-select';

@Component({
  standalone: true,
  imports: [UiSelect, ReactiveFormsModule],
  template: `
    <app-ui-select
      [options]="opciones"
      [value]="valorSeleccionado()"
      (valueChange)="valorSeleccionado.set($event)"
      placeholder="Seleccione un ??rea"
    />
  `,
})
class TestHost {
  readonly opciones: UiSelectOption[] = [
    { value: '', label: 'Todas las ??reas' },
    { value: 1, label: 'Atenci??n al Cliente' },
    { value: 2, label: 'Cobranzas' },
  ];
  readonly valorSeleccionado = signal<string | number>('');
}

describe('UiSelect', () => {
  async function crearHost() {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    return fixture;
  }

  it('muestra el placeholder cuando no hay valor seleccionado', async () => {
    const fixture = await crearHost();
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Seleccione un ??rea');
  });

  it('abre el men?? desplegable al hacer clic en el trigger', async () => {
    const fixture = await crearHost();
    const trigger = fixture.nativeElement.querySelector('button');
    trigger.click();
    fixture.detectChanges();

    const popover = fixture.nativeElement.querySelector('[role="listbox"]');
    expect(popover).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Atenci??n al Cliente');
  });

  it('selecciona una opci??n al hacer clic y emite valueChange', async () => {
    const fixture = await crearHost();
    const trigger = fixture.nativeElement.querySelector('button');
    trigger.click();
    fixture.detectChanges();

    const opciones = fixture.nativeElement.querySelectorAll('[role="option"]');
    (opciones[1] as HTMLElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.valorSeleccionado()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Atenci??n al Cliente');
  });

  it('cierra el desplegable al hacer clic fuera del select', async () => {
    const fixture = await crearHost();
    const trigger = fixture.nativeElement.querySelector('button');
    trigger.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeTruthy();

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('cierra el desplegable al presionar Escape', async () => {
    const fixture = await crearHost();
    const trigger = fixture.nativeElement.querySelector('button');
    trigger.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('cierra el desplegable anterior cuando se abre otro select', async () => {
    @Component({
      standalone: true,
      imports: [UiSelect],
      template: `
        <app-ui-select id="select-1" [options]="opciones" placeholder="Select 1" />
        <app-ui-select id="select-2" [options]="opciones" placeholder="Select 2" />
      `,
    })
    class DualHost {
      readonly opciones = ['Opci??n A', 'Opci??n B'];
    }

    const dualFixture = TestBed.createComponent(DualHost);
    dualFixture.detectChanges();

    const buttons = dualFixture.nativeElement.querySelectorAll('button');
    const btn1 = buttons[0] as HTMLButtonElement;
    const btn2 = buttons[1] as HTMLButtonElement;

    // Abrir Select 1
    btn1.click();
    dualFixture.detectChanges();
    expect(dualFixture.nativeElement.querySelectorAll('[role="listbox"]').length).toBe(1);

    // Abrir Select 2 -> Select 1 debe cerrarse
    btn2.click();
    dualFixture.detectChanges();
    const listboxes = dualFixture.nativeElement.querySelectorAll('[role="listbox"]');
    expect(listboxes.length).toBe(1);
  });

  it('permite filtrar interactivamente las opciones con searchable=true ignorando acentos', async () => {
    @Component({
      standalone: true,
      imports: [UiSelect],
      template: `
        <app-ui-select
          [options]="opciones"
          [searchable]="true"
          searchPlaceholder="Buscar opci??n..."
        />
      `,
    })
    class SearchableHost {
      readonly opciones = [
        { value: 1, label: 'Atenci??n al Cliente' },
        { value: 2, label: 'Cobranzas' },
        { value: 3, label: 'Ventas y Promoci??n' },
      ];
    }

    const fixture = TestBed.createComponent(SearchableHost);
    fixture.detectChanges();

    // Abrir el select
    const trigger = fixture.nativeElement.querySelector('button');
    trigger.click();
    fixture.detectChanges();

    const searchInput = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    expect(searchInput).toBeTruthy();
    expect(searchInput.placeholder).toBe('Buscar opci??n...');

    // Buscar "atencion" sin tilde -> debe coincidir con "Atenci??n al Cliente"
    searchInput.value = 'atencion';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    let opciones = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(opciones.length).toBe(1);
    expect(opciones[0].textContent).toContain('Atenci??n al Cliente');

    // Buscar t??rmino inexistente
    searchInput.value = 'inexistente';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    opciones = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(opciones.length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No se encontraron resultados para "inexistente"');

    // Limpiar b??squeda haciendo clic en el bot??n X
    const clearBtn = fixture.nativeElement.querySelector('button[aria-label="Limpiar b??squeda"]') as HTMLButtonElement;
    expect(clearBtn).toBeTruthy();
    clearBtn.click();
    fixture.detectChanges();

    opciones = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(opciones.length).toBe(3);
  });
});
