import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-multiple-choice',
  templateUrl: './multiple-choice.component.html',
  styleUrl: './multiple-choice.component.css',
  standalone: false
})
export class MultipleChoiceComponent implements OnChanges {
  @Input() question: string = '';
  @Input() choices: string[] = [];
  @Input() correctAnswer: string = '';
  @Input() badgeLabel = 'Multiple Choice';

  @Output() answer = new EventEmitter<{ isCorrect: boolean; selected: string }>();
  @Output() dontKnow = new EventEmitter<void>();

  selected: string | null = null;
  showResult = false;
  labels = ['A', 'B', 'C', 'D'];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['question'] || changes['choices'] || changes['correctAnswer']) {
      this.selected = null;
      this.showResult = false;
      this.cdr.detectChanges();
    }
  }

  handleSelect(choice: string) {
    if (this.showResult) return;
    this.selected = choice;
    this.showResult = true;
    this.cdr.detectChanges();

    const isCorrect = choice === this.correctAnswer;

    setTimeout(() => {
      this.answer.emit({ isCorrect, selected: choice });
      this.cdr.detectChanges();
    }, 1400);
  }

  handleDontKnow() {
    if (this.showResult) return;
    this.selected = '__dont_know__';
    this.showResult = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.dontKnow.emit();
      this.cdr.detectChanges();
    }, 1400);
  }

  getButtonClass(choice: string): string {
    if (!this.showResult) return 'choice-btn';
    if (choice === this.correctAnswer) return 'choice-btn correct';
    if (choice === this.selected && choice !== this.correctAnswer) return 'choice-btn incorrect';
    return 'choice-btn opacity-50';
  }
}
