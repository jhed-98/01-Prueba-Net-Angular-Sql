import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.page').then(m => m.DashboardPage)
  },
  {
    path: 'ejemplo',
    loadComponent: () => import('./features/ejemplo/ejemplo.page').then(m => m.EjemploPage)
  },
  {
    path: 'tareas',
    loadComponent: () => import('./features/tareas/tareas.page').then(m => m.TareasPage)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
