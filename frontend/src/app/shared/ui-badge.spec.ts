import { TestBed } from '@angular/core/testing';
import { UiBadge } from './ui-badge';

describe('UiBadge', () => {
  async function crear(tone?: string) {
    await TestBed.configureTestingModule({ imports: [UiBadge] }).compileComponents();
    const fixture = TestBed.createComponent(UiBadge);
    if (tone) {
      fixture.componentRef.setInput('tone', tone);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('crea el componente con tono info por defecto', async () => {
    const fixture = await crear();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.classList.contains('bg-blue-50')).toBe(true);
  });

  it('aplica el tono success', async () => {
    const fixture = await crear('success');
    const el = fixture.nativeElement as HTMLSpanElement;
    expect(el.classList.contains('bg-emerald-50')).toBe(true);
    expect(el.classList.contains('text-emerald-700')).toBe(true);
  });

  it('aplica el tono danger', async () => {
    const fixture = await crear('danger');
    const el = fixture.nativeElement as HTMLSpanElement;
    expect(el.classList.contains('bg-red-50')).toBe(true);
  });

  it('aplica el tono pending', async () => {
    const fixture = await crear('pending');
    const el = fixture.nativeElement as HTMLSpanElement;
    expect(el.classList.contains('bg-orange-50')).toBe(true);
  });
});
