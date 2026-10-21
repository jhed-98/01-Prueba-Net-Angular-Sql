import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { mockResponse, MockStore } from '../../../core/mock/mock-api';
import { TareaService } from './tarea.service';
import { CATEGORIAS_TAREA, CreateTareaRequest, Tarea } from '../models/tarea.model';

@Injectable()
export class MockTareaService implements TareaService {
  private readonly store = new MockStore<Tarea>([
    {
      id: 1,
      titulo: 'Instalación FO - San Borja',
      descripcion: 'Instalación de acometida y ONT para cliente residencial',
      fechaInicio: '2026-10-21T08:00:00',
      fechaFin: null,
      estado: 'EN_PROCESO',
      categoriaId: 1,
      categoriaNombre: 'Instalación de Fibra Óptica Residencial',
      fechaCreacion: '2026-10-21T08:00:00'
    },
    {
      id: 2,
      titulo: 'Corte de Fibra en Av. Javier Prado',
      descripcion: 'Avería masiva reportada por NOC en tramo troncal',
      fechaInicio: '2026-10-20T10:00:00',
      fechaFin: '2026-10-20T18:00:00',
      estado: 'COMPLETADA',
      categoriaId: 2,
      categoriaNombre: 'Atención de Avería Técnica Crítica',
      fechaCreacion: '2026-10-20T10:00:00'
    },
    {
      id: 3,
      titulo: 'Mantenimiento Nodo Central Sur',
      descripcion: 'Reemplazo de fuentes de poder y limpieza de bandejas ODF',
      fechaInicio: '2026-10-22T09:00:00',
      fechaFin: null,
      estado: 'PENDIENTE',
      categoriaId: 3,
      categoriaNombre: 'Mantenimiento Preventivo de Nodo',
      fechaCreacion: '2026-10-21T09:00:00'
    }
  ]);

  listar(): Observable<Tarea[]> {
    return mockResponse(this.store.all().sort((a, b) => b.id - a.id));
  }

  crear(request: CreateTareaRequest): Observable<Tarea> {
    const categoria = CATEGORIAS_TAREA.find(c => c.value === request.categoriaId);
    const tarea = this.store.insert({
      ...request,
      estado: 'PENDIENTE',
      categoriaNombre: categoria?.label ?? '',
      fechaCreacion: new Date().toISOString()
    });
    return mockResponse(tarea);
  }
}
