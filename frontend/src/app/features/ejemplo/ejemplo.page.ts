import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EJEMPLO_SERVICE } from './services/ejemplo.service';
import { MockEjemploService } from './services/ejemplo.mock';
import { EjemploHttpService } from './services/ejemplo-http.service';
import { ItemEjemplo } from './models/ejemplo.model';
import { UiButton } from '../../shared/ui-button';
import { UiInput } from '../../shared/ui-input';
import { UiSelect } from '../../shared/ui-select';
import { UiModal } from '../../shared/ui-modal';
import { UiToast, ToastTone } from '../../shared/ui-toast';
import { formatHttpErrorMessage } from '../../core/utils/http-error';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-ejemplo-page',
  standalone: true,
  imports: [UiButton, UiInput, UiSelect, UiModal, UiToast],
  providers: [
    {
      provide: EJEMPLO_SERVICE,
      useClass: environment.useMock ? MockEjemploService : EjemploHttpService
    }
  ],
  templateUrl: './ejemplo.page.html'
})
export class EjemploPage implements OnInit {
  private readonly service = inject(EJEMPLO_SERVICE);

  readonly items = signal<ItemEjemplo[]>([]);
  readonly modalAbierto = signal(false);
  readonly nombreInput = signal('');
  readonly categoriaInput = signal('General');

  readonly toast = signal<{ open: boolean; tone: ToastTone; message: string }>({
    open: false,
    tone: 'info',
    message: ''
  });

  async ngOnInit(): Promise<void> {
    await this.cargarItems();
  }

  async cargarItems(): Promise<void> {
    try {
      const datos = await firstValueFrom(this.service.listar());
      this.items.set(datos);
    } catch (err) {
      this.mostrarToast('error', formatHttpErrorMessage(err));
    }
  }

  abrirModalCreacion(): void {
    this.nombreInput.set('');
    this.categoriaInput.set('General');
    this.modalAbierto.set(true);
  }

  async guardarNuevo(): Promise<void> {
    const nom = this.nombreInput().trim();
    if (!nom) {
      this.mostrarToast('error', 'El nombre es obligatorio.');
      return;
    }
    try {
      await firstValueFrom(this.service.crear(nom, this.categoriaInput()));
      await this.cargarItems();
      this.modalAbierto.set(false);
      this.mostrarToast('success', 'Registro creado con éxito.');
    } catch (err) {
      this.mostrarToast('error', formatHttpErrorMessage(err));
    }
  }

  async eliminarItem(id: number): Promise<void> {
    try {
      await firstValueFrom(this.service.eliminar(id));
      await this.cargarItems();
      this.mostrarToast('success', 'Registro eliminado.');
    } catch (err) {
      this.mostrarToast('error', formatHttpErrorMessage(err));
    }
  }

  mostrarToast(tone: ToastTone, message: string): void {
    this.toast.set({ open: true, tone, message });
  }

  cerrarToast(): void {
    this.toast.update(t => ({ ...t, open: false }));
  }

  protected String(v: unknown): string {
    return String(v);
  }
}
