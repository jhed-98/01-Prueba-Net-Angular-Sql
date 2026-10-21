import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ItemEjemplo } from '../models/ejemplo.model';

export interface EjemploService {
  listar(): Observable<ItemEjemplo[]>;
  crear(nombre: string, categoria: string): Observable<ItemEjemplo>;
  eliminar(id: number): Observable<void>;
}

export const EJEMPLO_SERVICE = new InjectionToken<EjemploService>('EJEMPLO_SERVICE');
