import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-ui-modal',
  standalone: true,
  templateUrl: './ui-modal.html'
})
export class UiModal {
  open = input(false);
  title = input('');
  description = input('');
  closed = output<void>();
}
