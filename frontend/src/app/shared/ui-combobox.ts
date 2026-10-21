import { Component, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { UiSelect, type UiSelectOption } from './ui-select';

/**
 * Componente Combobox especializado para listas extensas de opciones.
 * Incorpora un buscador interactivo en el desplegable con filtrado en tiempo real,
 * insensible a may??sculas y acentos diacr??ticos.
 */
@Component({
  selector: 'app-ui-combobox',
  standalone: true,
  imports: [UiSelect, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiCombobox),
      multi: true,
    },
  ],
  templateUrl: './ui-combobox.html',
})
export class UiCombobox implements ControlValueAccessor {
  readonly id = input<string>('');
  readonly placeholder = input<string>('Seleccione...');
  readonly searchPlaceholder = input<string>('Buscar...');
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly options = input<(UiSelectOption | string | number)[]>([]);
  readonly value = input<string | number | null | undefined>(undefined);

  readonly valueChange = output<string | number>();

  protected readonly valorInterno = signal<string | number>('');
  protected readonly disabledPorForm = signal<boolean>(false);

  private onChange: (v: string | number) => void = () => {};
  private onTouched: () => void = () => {};

  protected isDisabled(): boolean {
    return this.disabled() || this.disabledPorForm();
  }

  protected onValueChange(val: string | number): void {
    this.valorInterno.set(val);
    this.onChange(val);
    this.onTouched();
    this.valueChange.emit(val);
  }

  // ControlValueAccessor
  writeValue(value: string | number | null | undefined): void {
    this.valorInterno.set(value ?? '');
  }

  registerOnChange(fn: (v: string | number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledPorForm.set(isDisabled);
  }
}
