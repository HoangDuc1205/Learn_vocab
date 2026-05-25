import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { Word } from '../progress-tracker/progress-tracker.component';

export type TransitionPhase =
  | 'mc_to_written'
  | 'written_to_synonym_mc'
  | 'synonym_mc_to_synonym_written'
  | 'synonym_written_to_vocab';

@Component({
  selector: 'app-phase-transition',
  templateUrl: './phase-transition.component.html',
  styleUrl: './phase-transition.component.css',
  standalone: false
})
export class PhaseTransitionComponent {
  @Input() phase: TransitionPhase = 'mc_to_written';
  @Input() words: Word[] = [];
  @Output() continueRound = new EventEmitter<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  get continueLabel(): string {
    switch (this.phase) {
      case 'mc_to_written':
        return 'Bắt đầu Vòng 2 – Tự luận định nghĩa';
      case 'written_to_synonym_mc':
        return 'Bắt đầu Vòng 3 – Trắc nghiệm synonym';
      case 'synonym_mc_to_synonym_written':
        return 'Bắt đầu Vòng 4 – Tự luận synonym';
      case 'synonym_written_to_vocab':
        return 'Bắt đầu Vòng 5 – Nhập từ vựng';
      default:
        return 'Tiếp tục';
    }
  }
}
