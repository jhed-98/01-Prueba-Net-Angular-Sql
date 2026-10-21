import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EjemploService } from './ejemplo.service';
import { ItemEjemplo } from '../models/ejemplo.model';
import { environment } from '../../../../environments/environment';

@Injectable()
export class EjemploHttpService implements EjemploService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/ejemplos`;

  listar(): Observable<ItemEjemplo[]> {
    return this.http.get<ItemEjemplo[]>(this.endpoint);
  }

  crear(nombre: string, categoria: string): Observable<ItemEjemplo> {
    return this.http.post<ItemEjemplo>(this.endpoint, { nombre, categoria });
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
