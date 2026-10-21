import {
  Component,
  computed,
  Directive,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  Injectable,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideCheck, LucideChevronDown, LucideSearch, LucideX } from '@lucide/angular';

export interface UiSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface UiSelectCloseable {
  close: () => void;
}

/** Coordinador global para asegurar que s??lo un men?? desplegable est?? abierto a la vez. */
@Injectable({ providedIn: 'root' })
export class UiSelectManager {
  private activeSelect: UiSelectCloseable | null = null;

  registerOpen(select: UiSelectCloseable): void {
    if (this.activeSelect && this.activeSelect !== select) {
      this.activeSelect.close();
    }
    this.activeSelect = select;
  }

  registerClose(select: UiSelectCloseable): void {
    if (this.activeSelect === select) {
      this.activeSelect = null;
    }
  }
}

@Directive({
  selector: 'select[uiSelect]',
  standalone: true,
  host: {
    '[class]': 'classes()',
  },
})
export class UiSelectDirective {
  readonly invalid = input<boolean>(false);

  protected classes() {
    const base =
      'h-9 w-full appearance-none rounded-lg border bg-white px-3 pr-8 text-sm text-slate-800 transition-colors focus:outline-hidden focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400';
    const border = this.invalid()
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
      : 'border-gd-border focus:border-slate-800 focus:ring-slate-900/15';

    return `${base} ${border}`;
  }
}

@Component({
  selector: 'app-ui-select',
  standalone: true,
  imports: [LucideChevronDown, LucideCheck, LucideSearch, LucideX],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiSelect),
      multi: true,
    },
  ],
  templateUrl: './ui-select.html',
})
export class UiSelect implements ControlValueAccessor, OnDestroy {
  private readonly elRef = inject(ElementRef);
  private readonly selectManager = inject(UiSelectManager);

  readonly id = input<string>('');
  readonly placeholder = input<string>('Seleccione...');
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly options = input<(UiSelectOption | string | number)[]>([]);
  readonly value = input<string | number | null | undefined>(undefined);
  readonly searchable = input<boolean>(false);
  readonly searchPlaceholder = input<string>('Buscar...');

  readonly valueChange = output<string | number>();

  protected readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  protected readonly valorInterno = signal<string | number>('');
  protected readonly abierto = signal(false);
  protected readonly disabledPorForm = signal(false);
  protected readonly filtroBusqueda = signal<string>('');

  private onChange: (v: string | number) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnDestroy(): void {
    this.selectManager.registerClose(this);
  }

  /** Cierra el desplegable y notifica al gestor. */
  close(): void {
    if (this.abierto()) {
      this.abierto.set(false);
      this.filtroBusqueda.set('');
      this.selectManager.registerClose(this);
      this.onTouched();
    }
  }

  protected readonly isDisabled = computed(() => this.disabled() || this.disabledPorForm());

  protected readonly opcionesNormalizadas = computed<UiSelectOption[]>(() => {
    return this.options().map((opt) => {
      if (typeof opt === 'object' && opt !== null && 'value' in opt) {
        return opt as UiSelectOption;
      }
      return { value: opt, label: String(opt) };
    });
  });

  protected readonly opcionesFiltradas = computed<UiSelectOption[]>(() => {
    const lista = this.opcionesNormalizadas();
    const filtro = this.normalizarTexto(this.filtroBusqueda());
    if (!filtro) return lista;
    return lista.filter((opt) => this.normalizarTexto(opt.label).includes(filtro));
  });

  protected readonly valorActual = computed(() => {
    const valInput = this.value();
    if (valInput !== undefined && valInput !== null) {
      return String(valInput);
    }
    return String(this.valorInterno());
  });

  protected readonly labelSeleccionado = computed(() => {
    const val = this.valorActual();
    if (val === '' || val === null || val === undefined) return '';
    const match = this.opcionesNormalizadas().find((o) => String(o.value) === val);
    return match ? match.label : '';
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  protected toggleOpen(): void {
    if (this.isDisabled()) return;
    if (this.abierto()) {
      this.close();
    } else {
      this.abierto.set(true);
      this.selectManager.registerOpen(this);
      if (this.searchable()) {
        setTimeout(() => this.searchInputRef()?.nativeElement?.focus(), 0);
      }
    }
  }

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filtroBusqueda.set(input.value);
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'Escape') {
      this.close();
    }
  }

  protected limpiarFiltro(event: MouseEvent): void {
    event.stopPropagation();
    this.filtroBusqueda.set('');
    this.searchInputRef()?.nativeElement?.focus();
  }

  private normalizarTexto(texto: string): string {
    return (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  protected seleccionarOpcion(opt: UiSelectOption): void {
    if (opt.disabled) return;
    this.valorInterno.set(opt.value);
    this.onChange(opt.value);
    this.valueChange.emit(opt.value);
    this.close();
  }

  protected esSeleccionado(val: string | number): boolean {
    return String(val) === this.valorActual();
  }

  protected triggerClass(): string {
    const base =
      'flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-white px-3 py-1.5 text-left text-sm text-slate-800 transition-all duration-150 hover:border-slate-400 focus:outline-hidden focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-60';

    const border = this.invalid()
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
      : this.abierto()
        ? 'border-slate-800 ring-2 ring-slate-900/15'
        : 'border-gd-border focus:border-slate-800 focus:ring-slate-900/15';

    return `${base} ${border}`;
  }

  protected opcionClass(opt: UiSelectOption): string {
    const sel = this.esSeleccionado(opt.value);
    if (opt.disabled) {
      return 'flex w-full cursor-not-allowed items-center justify-between rounded-lg px-2.5 py-1.5 text-sm text-slate-300';
    }
    return `flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
      sel ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
    }`;
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
