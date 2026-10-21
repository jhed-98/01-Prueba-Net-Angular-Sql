import { TestBed } from '@angular/core/testing';
import { DashboardPage } from './dashboard.page';
import { provideRouter } from '@angular/router';

describe('DashboardPage', () => {
  it('debe crear el dashboard', () => {
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [provideRouter([])]
    });
    const fixture = TestBed.createComponent(DashboardPage);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
