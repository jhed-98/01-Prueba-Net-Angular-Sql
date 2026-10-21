import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiButton } from '../../shared/ui-button';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, UiButton],
  templateUrl: './dashboard.page.html'
})
export class DashboardPage {}
