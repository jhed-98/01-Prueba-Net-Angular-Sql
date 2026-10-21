import { Component, input, output } from '@angular/core';

@Component({
  selector: 'label[uiCheckbox]',
  standalone: true,
  templateUrl: './ui-checkbox.html',
  host: {
    class: 'inline-flex cursor-pointer items-center gap-2',
  },
})
export class UiCheckbox {
  readonly checked = input(false);
  readonly disabled = input(false);
  readonly onToggle = output<boolean>();

  protected toggle() {
    this.onToggle.emit(!this.checked());
  }
}
