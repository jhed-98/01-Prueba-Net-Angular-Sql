import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateTareaRequest, Tarea } from '../models/tarea.model';

export interface TareaService {
  listar(): Observable<Tarea[]>;
  crear(request: CreateTareaRequest): Observable<Tarea>;
}

export const TAREA_SERVICE = new InjectionToken<TareaService>('TAREA_SERVICE');
