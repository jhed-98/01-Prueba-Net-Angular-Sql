import { UiSelectOption } from '../../../shared/ui-select';

export type EstadoTarea = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA';

export interface Tarea {
  id: number;
  titulo: string;
  descripcion: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  estado: EstadoTarea;
  categoriaId: number;
  categoriaNombre: string;
  fechaCreacion: string;
}

export interface CreateTareaRequest {
  titulo: string;
  descripcion: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  categoriaId: number;
}

/** Categorías activas (semilla de 01_init_database.sql); no hay endpoint de categorías. */
export const CATEGORIAS_TAREA: UiSelectOption[] = [
  { value: 1, label: 'Instalación de Fibra Óptica Residencial' },
  { value: 2, label: 'Atención de Avería Técnica Crítica' },
  { value: 3, label: 'Mantenimiento Preventivo de Nodo' }
];
