import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { mockResponse, MockStore } from '../../../core/mock/mock-api';
import { EjemploService } from './ejemplo.service';
import { ItemEjemplo } from '../models/ejemplo.model';

@Injectable()
export class MockEjemploService implements EjemploService {
  private readonly store = new MockStore<ItemEjemplo>([
    { id: 1, nombre: 'Configuraci??n A', categoria: 'General', activo: true },
    { id: 2, nombre: 'Configuraci??n B', categoria: 'Avanzado', activo: true },
    { id: 3, nombre: 'Configuraci??n C', categoria: 'General', activo: true }
  ]);

  listar(): Observable<ItemEjemplo[]> {
    return mockResponse(this.store.all().filter(i => i.activo));
  }

  crear(nombre: string, categoria: string): Observable<ItemEjemplo> {
    const item = this.store.insert({ nombre, categoria, activo: true });
    return mockResponse(item);
  }

  eliminar(id: number): Observable<void> {
    this.store.update(id, { activo: false });
    return mockResponse(undefined);
  }
}
