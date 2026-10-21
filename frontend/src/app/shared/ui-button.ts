import { Component, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'button[uiButton], a[uiButton]',
  standalone: true,
  host: {
    '[class]': 'classes()',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.aria-disabled]': 'disabled()',
  },
  templateUrl: './ui-button.html'
})
export class UiButton {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  disabled = input(false);

  protected classes(): string {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed';
    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5',
      md: 'text-xs font-semibold px-3.5 py-2 gap-2',
      lg: 'text-sm font-semibold px-4 py-2.5 gap-2.5'
    }[this.size()];

    const variants = {
      primary: 'bg-red-600 text-white hover:bg-red-700 shadow-xs',
      secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
      outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
      destructive: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200',
      ghost: 'text-slate-600 hover:bg-slate-100'
    }[this.variant()];

    return `${base} ${sizes} ${variants}`;
  }
}
