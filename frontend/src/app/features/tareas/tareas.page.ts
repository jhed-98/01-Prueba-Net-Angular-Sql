import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TAREA_SERVICE } from './services/tarea.service';
import { MockTareaService } from './services/tarea.mock';
import { TareaHttpService } from './services/tarea-http.service';
import { CATEGORIAS_TAREA, EstadoTarea, Tarea } from './models/tarea.model';
import { UiButton } from '../../shared/ui-button';
import { UiInput } from '../../shared/ui-input';
import { UiSelect } from '../../shared/ui-select';
import { UiModal } from '../../shared/ui-modal';
import { UiBadge } from '../../shared/ui-badge';
import { UiToast, ToastTone } from '../../shared/ui-toast';
import { formatHttpErrorMessage } from '../../core/utils/http-error';
import { environment } from '../../../environments/environment';

/** FechaFin (si se envía) debe ser >= FechaInicio. */
function fechaFinValidator(group: AbstractControl): ValidationErrors | null {
  const inicio = group.get('fechaInicio')?.value as string;
  const fin = group.get('fechaFin')?.value as string;
  return inicio && fin && fin < inicio ? { fechaFinMenor: true } : null;
}

@Component({
  selector: 'app-tareas-page',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, UiButton, UiInput, UiSelect, UiModal, UiBadge, UiToast],
  providers: [
    {
      provide: TAREA_SERVICE,
      useClass: environment.useMock ? MockTareaService : TareaHttpService
    }
  ],
  templateUrl: './tareas.page.html'
})
export class TareasPage implements OnInit {
  private readonly service = inject(TAREA_SERVICE);
  private readonly fb = inject(FormBuilder);

  readonly categorias = CATEGORIAS_TAREA;
  readonly tareas = signal<Tarea[]>([]);
  readonly modalAbierto = signal(false);
  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      descripcion: ['', [Validators.maxLength(500)]],
      fechaInicio: ['', [Validators.required]],
      fechaFin: [''],
      categoriaId: [null as number | null, [Validators.required]]
    },
    { validators: fechaFinValidator }
  );

  readonly toast = signal<{ open: boolean; tone: ToastTone; message: string }>({
    open: false,
    tone: 'info',
    message: ''
  });

  async ngOnInit(): Promise<void> {
    await this.cargarTareas();
  }

  async cargarTareas(): Promise<void> {
    try {
      this.tareas.set(await firstValueFrom(this.service.listar()));
    } catch (err) {
      this.mostrarToast('error', formatHttpErrorMessage(err));
    }
  }

  abrirModalCreacion(): void {
    this.form.reset({ titulo: '', descripcion: '', fechaInicio: '', fechaFin: '', categoriaId: null });
    this.modalAbierto.set(true);
  }

  async guardarNueva(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarToast('error', 'Revisa los campos del formulario.');
      return;
    }
    const v = this.form.getRawValue();
    this.guardando.set(true);
    try {
      await firstValueFrom(
        this.service.crear({
          titulo: v.titulo.trim(),
          descripcion: v.descripcion.trim() || null,
          fechaInicio: v.fechaInicio,
          fechaFin: v.fechaFin || null,
          categoriaId: Number(v.categoriaId)
        })
      );
      await this.cargarTareas();
      this.modalAbierto.set(false);
      this.mostrarToast('success', 'Tarea creada con éxito.');
    } catch (err) {
      this.mostrarToast('error', formatHttpErrorMessage(err));
    } finally {
      this.guardando.set(false);
    }
  }

  tonoEstado(estado: EstadoTarea): 'success' | 'pending' | 'info' {
    return estado === 'COMPLETADA' ? 'success' : estado === 'EN_PROCESO' ? 'info' : 'pending';
  }

  mostrarToast(tone: ToastTone, message: string): void {
    this.toast.set({ open: true, tone, message });
  }

  cerrarToast(): void {
    this.toast.update(t => ({ ...t, open: false }));
  }
}
