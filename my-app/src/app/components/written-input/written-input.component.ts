import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-written-input',
  templateUrl: './written-input.component.html',
  styleUrl: './written-input.component.css',
  standalone: false
})
export class WrittenInputComponent implements OnChanges, AfterViewInit {
  @Input() question: string = '';
  @Input() correctAnswer: string = '';
  @Input() alternateAnswers: string[] = [];
  @Input() badgeLabel = 'Written Answer';
  @Input() placeholder = 'Type your answer...';

  @Output() answer = new EventEmitter<{ isCorrect: boolean; value: string }>();
  @Output() dontKnow = new EventEmitter<void>();

  @ViewChild('answerInput') answerInput!: ElementRef<HTMLInputElement>;

  inputVal: string = '';
  showResult = false;
  isCorrect = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['question'] || changes['correctAnswer']) {
      this.inputVal = '';
      this.showResult = false;
      this.isCorrect = false;
      this.cdr.detectChanges();
      this.focusInput();
    }
  }

  ngAfterViewInit() {
    this.focusInput();
  }

  private focusInput() {
    setTimeout(() => {
      if (this.answerInput?.nativeElement) {
        this.answerInput.nativeElement.focus();
        this.cdr.detectChanges();
      }
    }, 300);
  }

  private normalize(str: string): string {
    return str.trim().toLowerCase();
  }

  handleSubmit(e?: Event) {
    e?.preventDefault();
    if (this.showResult || !this.inputVal.trim()) return;

    const answers = [this.correctAnswer, ...this.alternateAnswers].filter(a => a.trim());
    const normalizedInput = this.normalize(this.inputVal);
    const correct = answers.some(a => this.normalize(a) === normalizedInput);
    this.isCorrect = correct;
    this.showResult = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.answer.emit({ isCorrect: correct, value: this.inputVal.trim() });
      this.cdr.detectChanges();
    }, 1600);
  }

  handleDontKnow() {
    if (this.showResult) return;
    this.showResult = true;
    this.isCorrect = false;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.dontKnow.emit();
      this.cdr.detectChanges();
    }, 1600);
  }
}
