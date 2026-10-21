import { Component, input } from '@angular/core';

type BadgeTone = 'success' | 'pending' | 'info' | 'muted' | 'danger';

@Component({
  selector: 'span[uiBadge]',
  standalone: true,
  templateUrl: './ui-badge.html',
  host: {
    '[class]': 'classes()',
  },
})
export class UiBadge {
  readonly tone = input<BadgeTone>('info');

  protected classes() {
    const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold';
    const tones: Record<BadgeTone, string> = {
      success: 'bg-emerald-50 text-emerald-700',
      pending: 'bg-orange-50 text-orange-700',
      info: 'bg-blue-50 text-blue-700',
      muted: 'bg-slate-100 text-slate-500',
      danger: 'bg-red-50 text-red-700',
    };

    return `${base} ${tones[this.tone()]}`;
  }
}
