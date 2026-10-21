import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiTable, type UiTableColumn } from './ui-table';

interface Fila {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-host',
  standalone: true,
  imports: [UiTable],
  template: `<app-ui-table
    [rows]="filas"
    [columns]="columnas"
    [selectedIds]="seleccion"
    (selectionChanged)="onSeleccion($event)"
    (pageSizeChange)="onPageSize($event)"
  />`,
})
class HostComponent {
  filas: Fila[] = [];
  columnas: UiTableColumn<Fila>[] = [
    { key: 'id', label: 'ID' },
    { key: 'nombre', label: 'Nombre', cell: (f) => f.nombre.toUpperCase() },
  ];
  seleccion: number[] = [];
  onSeleccion(ids: number[]) {
    this.seleccion = ids;
  }
  onPageSize = vi.fn();
}

describe('UiTable', () => {
  function crear(filas: Fila[]) {
    TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.filas = filas;
    fixture.detectChanges();
    return fixture;
  }

  it('renderiza las columnas y celdas con la funci??n cell', () => {
    const fixture = crear([
      { id: 1, nombre: 'uno' },
      { id: 2, nombre: 'dos' },
    ]);
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('ID');
    expect(texto).toContain('Nombre');
    expect(texto).toContain('UNO');
    expect(texto).toContain('DOS');
  });

  it('muestra el mensaje de vac??o cuando no hay filas', () => {
    const fixture = crear([]);
    expect(fixture.nativeElement.textContent).toContain('No hay registros para mostrar.');
  });

  it('emite la selecci??n de una fila', () => {
    const fixture = crear([
      { id: 1, nombre: 'uno' },
      { id: 2, nombre: 'dos' },
    ]);
    const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
    (checkboxes[1] as HTMLInputElement).dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.componentInstance.seleccion).toEqual([1]);
  });

  it('emite la selecci??n de todas las filas de la p??gina', () => {
    const fixture = crear([
      { id: 1, nombre: 'uno' },
      { id: 2, nombre: 'dos' },
    ]);
    const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
    (checkboxes[0] as HTMLInputElement).dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.componentInstance.seleccion).toEqual([1, 2]);
  });

  it('pagina cuando las filas superan el page size', () => {
    const filas: Fila[] = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      nombre: `f${i + 1}`,
    }));
    const fixture = crear(filas);
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('de 25');
    expect(texto).toContain('Anterior');
    expect(texto).toContain('Siguiente');
  });
});
