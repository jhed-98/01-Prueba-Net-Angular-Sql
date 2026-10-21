import { TestBed } from '@angular/core/testing';
import { EjemploPage } from './ejemplo.page';
import { EJEMPLO_SERVICE } from './services/ejemplo.service';
import { MockEjemploService } from './services/ejemplo.mock';

describe('EjemploPage', () => {
  let component: EjemploPage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EjemploPage],
      providers: [
        { provide: EJEMPLO_SERVICE, useClass: MockEjemploService }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(EjemploPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente y cargar la lista de ejemplos', async () => {
    expect(component).toBeTruthy();
    await component.cargarItems();
    expect(component.items().length).toBeGreaterThan(0);
  });
});
