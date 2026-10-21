import { TestBed } from '@angular/core/testing';
import { UiCheckbox } from './ui-checkbox';

describe('UiCheckbox', () => {
  async function crear() {
    await TestBed.configureTestingModule({ imports: [UiCheckbox] }).compileComponents();
    const fixture = TestBed.createComponent(UiCheckbox);
    fixture.detectChanges();
    return fixture;
  }

  it('crea el componente', async () => {
    const fixture = await crear();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('emite el valor invertido al hacer toggle', async () => {
    const fixture = await crear();
    const onToggle = vi.fn();
    fixture.componentRef.setInput('checked', false);
    fixture.componentInstance.onToggle.subscribe(onToggle);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('change'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('respeta el estado checked y disabled', async () => {
    const fixture = await crear();
    fixture.componentRef.setInput('checked', true);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.checked).toBe(true);
    expect(input.disabled).toBe(true);
  });
});
