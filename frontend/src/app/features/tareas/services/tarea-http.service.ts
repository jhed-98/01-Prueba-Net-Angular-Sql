import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TareaService } from './tarea.service';
import { CreateTareaRequest, Tarea } from '../models/tarea.model';
import { environment } from '../../../../environments/environment';

@Injectable()
export class TareaHttpService implements TareaService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/tareas`;

  listar(): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(this.endpoint);
  }

  crear(request: CreateTareaRequest): Observable<Tarea> {
    return this.http.post<Tarea>(this.endpoint, request);
  }
}
