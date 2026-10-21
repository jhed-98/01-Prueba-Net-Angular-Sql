import {
  Component,
  computed,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { LucideCheck, LucideChevronDown, LucideLoader2, LucideSearch, LucideX } from '@lucide/angular';
import { of, Subject, timer } from 'rxjs';
import { catchError, debounce, distinctUntilChanged, finalize, map, switchMap } from 'rxjs/operators';
import { UiSelectManager, type UiSelectOption } from './ui-select';
import { formatHttpErrorMessage } from '../core/utils/http-error';

/**
 * Componente Combobox As??ncrono / Remoto.
 * Permite buscar opciones en tiempo real consultando una URL de API v??a GET o POST.
 * Incluye debounce reactivo, cancelaci??n de peticiones obsoletas (switchMap),
 * mapeo inteligente de respuestas, spinner de carga, y compatibilidad total
 * con Reactive Forms (ControlValueAccessor).
 */
@Component({
  selector: 'app-ui-combobox-async',
  standalone: true,
  imports: [LucideChevronDown, LucideCheck, LucideSearch, LucideX, LucideLoader2, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiComboboxAsync),
      multi: true,
    },
  ],
  templateUrl: './ui-combobox-async.html',
})
export class UiComboboxAsync implements ControlValueAccessor, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly elRef = inject(ElementRef);
  private readonly selectManager = inject(UiSelectManager);

  // Entradas de Configuraci??n del API
  readonly apiUrl = input.required<string>();
  readonly method = input<'GET' | 'POST'>('GET');
  readonly queryParam = input<string>('q');
  readonly extraParams = input<Record<string, any>>({});
  readonly requestBodyTransform = input<((query: string, extra: Record<string, any>) => any) | undefined>(undefined);
  readonly mapResponse = input<((response: any) => UiSelectOption[]) | undefined>(undefined);
  readonly valueField = input<string>('value');
  readonly labelField = input<string>('label');
  readonly minChars = input<number>(1);
  readonly debounceTimeMs = input<number>(300);

  // Textos y Visualizaci??n
  readonly id = input<string>('');
  readonly placeholder = input<string>('Seleccione una opci??n...');
  readonly searchPlaceholder = input<string>('Escriba para buscar...');
  readonly loadingText = input<string>('Buscando en API...');
  readonly noResultsText = input<string>('No se encontraron resultados');
  readonly initialOption = input<UiSelectOption | undefined>(undefined);
  readonly initialLabel = input<string | undefined>(undefined);
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly value = input<string | number | null | undefined>(undefined);

  // Emisiones de Eventos
  readonly valueChange = output<string | number>();
  readonly selectionChange = output<UiSelectOption>();
  readonly searchChange = output<string>();
  readonly errorChange = output<string | null>();

  // Estados Internos con Signals y RxJS
  protected readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  protected readonly searchSubject = new Subject<string>();
  protected readonly cargando = signal<boolean>(false);
  protected readonly errorHttp = signal<string | null>(null);
  protected readonly opciones = signal<UiSelectOption[]>([]);
  protected readonly valorInterno = signal<string | number>('');
  protected readonly opcionSeleccionada = signal<UiSelectOption | null>(null);
  protected readonly abierto = signal<boolean>(false);
  protected readonly disabledPorForm = signal<boolean>(false);
  protected readonly filtroBusqueda = signal<string>('');

  private onChange: (v: string | number) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    this.searchSubject
      .pipe(
        debounce(() => timer(this.debounceTimeMs())),
        distinctUntilChanged(),
        switchMap((termino) => {
          const query = (termino ?? '').trim();
          this.searchChange.emit(query);

          if (query.length < this.minChars()) {
            this.cargando.set(false);
            this.errorHttp.set(null);
            return of([] as UiSelectOption[]);
          }

          this.cargando.set(true);
          this.errorHttp.set(null);
          this.errorChange.emit(null);

          return this.ejecutarPeticionHttp(query).pipe(
            map((res) => this.procesarRespuesta(res)),
            catchError((err) => {
              const msg = formatHttpErrorMessage(err);
              this.errorHttp.set(msg);
              this.errorChange.emit(msg);
              return of([] as UiSelectOption[]);
            }),
            finalize(() => this.cargando.set(false))
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((opts) => {
        this.opciones.set(opts);
      });
  }

  ngOnDestroy(): void {
    this.selectManager.registerClose(this);
  }

  /** Cierra el desplegable y notifica al gestor de selects. */
  close(): void {
    if (this.abierto()) {
      this.abierto.set(false);
      this.selectManager.registerClose(this);
      this.onTouched();
    }
  }

  protected readonly isDisabled = computed(() => this.disabled() || this.disabledPorForm());

  protected readonly minCharsTextComputed = computed(() => {
    const min = this.minChars();
    if (min <= 0) return 'Escriba un t??rmino para buscar';
    return `Escriba al menos ${min} ${min === 1 ? 'car??cter' : 'caracteres'} para buscar`;
  });

  protected readonly valorActual = computed(() => {
    const valInput = this.value();
    if (valInput !== undefined && valInput !== null) {
      return String(valInput);
    }
    return String(this.valorInterno());
  });

  protected readonly textoSeleccionado = computed(() => {
    const val = this.valorActual();
    if (val === '' || val === null || val === undefined) return '';

    // 1. Revisar si tenemos la opci??n seleccionada guardada
    const sel = this.opcionSeleccionada();
    if (sel && String(sel.value) === val) {
      return sel.label;
    }

    // 2. Revisar si est?? en la lista actual de opciones cargadas
    const match = this.opciones().find((o) => String(o.value) === val);
    if (match) {
      return match.label;
    }

    // 3. Revisar si se pas?? una opci??n o label inicial
    const initOpt = this.initialOption();
    if (initOpt && String(initOpt.value) === val) {
      return initOpt.label;
    }
    if (this.initialLabel()) {
      return this.initialLabel()!;
    }

    return '';
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
      setTimeout(() => {
        this.searchInputRef()?.nativeElement?.focus();
        if (this.minChars() === 0 && !this.filtroBusqueda()) {
          this.searchSubject.next('');
        }
      }, 0);
    }
  }

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = input.value;
    this.filtroBusqueda.set(val);
    this.searchSubject.next(val);
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
    this.searchSubject.next('');
    this.searchInputRef()?.nativeElement?.focus();
  }

  protected seleccionarOpcion(opt: UiSelectOption): void {
    if (opt.disabled) return;
    this.opcionSeleccionada.set(opt);
    this.valorInterno.set(opt.value);
    this.onChange(opt.value);
    this.valueChange.emit(opt.value);
    this.selectionChange.emit(opt);
    this.close();
  }

  protected esSeleccionado(val: string | number): boolean {
    return String(val) === this.valorActual();
  }

  private ejecutarPeticionHttp(query: string) {
    const url = this.apiUrl();
    const paramName = this.queryParam();
    const extra = this.extraParams();

    if (this.method().toUpperCase() === 'POST') {
      const transform = this.requestBodyTransform();
      const body = transform
        ? transform(query, extra)
        : { [paramName]: query, ...extra };
      return this.http.post(url, body);
    } else {
      let params = new HttpParams().set(paramName, query);
      if (extra) {
        for (const [k, v] of Object.entries(extra)) {
          if (v !== undefined && v !== null) {
            params = params.set(k, String(v));
          }
        }
      }
      return this.http.get(url, { params });
    }
  }

  private procesarRespuesta(res: any): UiSelectOption[] {
    const customMapper = this.mapResponse();
    if (customMapper) {
      return customMapper(res) ?? [];
    }

    let lista: any[] = [];
    if (Array.isArray(res)) {
      lista = res;
    } else if (res && typeof res === 'object') {
      if (Array.isArray(res.data)) lista = res.data;
      else if (Array.isArray(res.items)) lista = res.items;
      else if (Array.isArray(res.result)) lista = res.result;
      else if (Array.isArray(res.payload)) lista = res.payload;
      else if (Array.isArray(res.value)) lista = res.value;
    }

    const vField = this.valueField();
    const lField = this.labelField();

    return lista.map((item) => {
      if (typeof item === 'object' && item !== null) {
        const val = item[vField] ?? item.value ?? item.id ?? item.codigo ?? item.code;
        const lbl =
          item[lField] ??
          item.label ??
          item.nombre ??
          item.descripcion ??
          item.name ??
          item.title ??
          String(val);
        return {
          value: val,
          label: String(lbl),
          disabled: Boolean(item.disabled),
        };
      }
      return {
        value: item,
        label: String(item),
      };
    });
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
