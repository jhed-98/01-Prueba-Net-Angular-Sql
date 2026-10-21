import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiButton } from './ui-button';

@Component({
  standalone: true,
  imports: [UiButton],
  template: `<button uiButton variant="primary">Guardar</button>`
})
class TestHostComponent {}

describe('UiButton', () => {
  it('debe renderizar el bot??n estilizado', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.classList.contains('bg-red-600')).toBe(true);
  });
});
