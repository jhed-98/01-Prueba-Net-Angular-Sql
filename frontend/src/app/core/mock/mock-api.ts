import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

export function mockResponse<T>(data: T, delayMs = 120): Observable<T> {
  return of(structuredClone(data)).pipe(delay(delayMs));
}

export function mockError<T = never>(message: string, status = 400, delayMs = 120): Observable<T> {
  return throwError(() => ({ status, error: { error: message } })).pipe(delay(delayMs));
}

export class MockStore<T extends { id: number }> {
  constructor(private items: T[]) {}

  all(): T[] {
    return structuredClone(this.items);
  }

  get(id: number): T | undefined {
    const found = this.items.find(i => i.id === id);
    return found ? structuredClone(found) : undefined;
  }

  insert(data: Omit<T, 'id'>): T {
    const nextId = this.items.length > 0 ? Math.max(...this.items.map(i => i.id)) + 1 : 1;
    const nuevo = { ...data, id: nextId } as T;
    this.items.push(nuevo);
    return structuredClone(nuevo);
  }

  update(id: number, patch: Partial<T>): T | undefined {
    const index = this.items.findIndex(i => i.id === id);
    if (index < 0) return undefined;
    this.items[index] = { ...this.items[index], ...patch };
    return structuredClone(this.items[index]);
  }
}
