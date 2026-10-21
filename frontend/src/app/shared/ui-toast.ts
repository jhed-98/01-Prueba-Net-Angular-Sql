import { Component, input, output } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info';

@Component({
  selector: 'app-ui-toast',
  standalone: true,
  templateUrl: './ui-toast.html'
})
export class UiToast {
  open = input(false);
  tone = input<ToastTone>('info');
  message = input('');
  closed = output<void>();
}
