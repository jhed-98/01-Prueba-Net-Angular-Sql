import { Component, effect, input, output, signal, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { UiCheckbox } from './ui-checkbox';
import { UiSelectDirective } from './ui-select';

export interface UiTableColumn<T> {
  key: string;
  label: string;
  /** Funci??n opcional para renderizar el valor de la celda. */
  cell?: (row: T) => string;
  /** Template opcional para celdas personalizadas (recibe el row como contexto). */
  cellTemplate?: TemplateRef<{ $implicit: T }>;
}

@Component({
  selector: 'app-ui-table',
  standalone: true,
  imports: [UiCheckbox, UiSelectDirective, NgTemplateOutlet],
  templateUrl: './ui-table.html',
})
export class UiTable<T extends { id: number }> {
  readonly rows = input<T[]>([]);
  readonly columns = input<UiTableColumn<T>[]>([]);
  readonly selectable = input(true);
  readonly selectedIds = input<number[]>([]);
  readonly emptyMessage = input('No hay registros para mostrar.');
  readonly pageSize = input(20);
  readonly pageSizes = input([20, 50, 100]);

  readonly selectionChanged = output<number[]>();
  readonly pageSizeChange = output<number>();

  protected readonly page = signal(1);
  protected readonly pageSizeValue = signal(20);

  constructor() {
    effect(() => this.pageSizeValue.set(this.pageSize()));
  }

  protected totalPages() {
    return Math.max(1, Math.ceil(this.rows().length / this.pageSizeValue()));
  }

  protected pageStart() {
    return (this.page() - 1) * this.pageSizeValue();
  }

  protected pageEnd() {
    return Math.min(this.page() * this.pageSizeValue(), this.rows().length);
  }

  protected pageRows(): T[] {
    return this.rows().slice(this.pageStart(), this.pageEnd());
  }

  protected rowId(row: T): number {
    return row.id;
  }

  protected cellValue(col: UiTableColumn<T>, row: T): string {
    if (col.cell) {
      return col.cell(row);
    }
    const value = (row as Record<string, unknown>)[col.key];
    return value == null ? '' : String(value);
  }

  protected isSelected(row: T): boolean {
    return this.selectedIds().includes(row.id);
  }

  protected allSelected(): boolean {
    const page = this.pageRows();
    return page.length > 0 && page.every((r) => this.selectedIds().includes(r.id));
  }

  protected toggleRow(row: T): void {
    const ids = this.selectedIds();
    const next = ids.includes(row.id) ? ids.filter((id) => id !== row.id) : [...ids, row.id];
    this.selectionChanged.emit(next);
  }

  protected toggleAll(): void {
    const page = this.pageRows();
    const ids = this.selectedIds();
    const allOnPage = page.every((r) => ids.includes(r.id));
    const next = allOnPage
      ? ids.filter((id) => !page.some((r) => r.id === id))
      : [...new Set([...ids, ...page.map((r) => r.id)])];
    this.selectionChanged.emit(next);
  }

  protected onPageSize(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.page.set(1);
    this.pageSizeValue.set(value);
    this.pageSizeChange.emit(value);
  }
}
