import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Word } from '../progress-tracker/progress-tracker.component';

interface ConfettiParticle {
  id: number;
  left: number;
  color: string;
  delay: string;
  duration: string;
  size: string;
  borderRadius: string;
}

@Component({
  selector: 'app-completion-screen',
  templateUrl: './completion-screen.component.html',
  styleUrls: ['./completion-screen.component.css'],
  standalone: false
})
export class CompletionScreenComponent implements OnInit, OnDestroy {
  @Input() words: Word[] = [];
  @Input() isSessionComplete: boolean = false;
  @Input() sessionWords: Word[] = [];
  @Input() testNumber: number | null = null;

  @Output() restart = new EventEmitter<void>();
  @Output() continue = new EventEmitter<void>();

  mastered = 0;
  familiar = 0;
  notLearned = 0;
  total = 0;
  allDone = false;
  pct = 0;

  particles: ConfettiParticle[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.total = this.words.length;
    this.mastered = this.words.filter(w => w.status === 'mastered').length;
    this.familiar = this.words.filter(
      w =>
        w.status === 'familiar' ||
        w.status === 'written_passed' ||
        w.status === 'synonym_mc_passed' ||
        w.status === 'synonym_written_passed'
    ).length;
    this.notLearned = this.words.filter(w => w.status === 'not_learned').length;
    this.allDone = this.mastered === this.total;
    this.pct = this.total > 0 ? Math.round((this.mastered / this.total) * 100) : 0;

    if (this.allDone) {
      this.initConfetti();
    }
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.particles = [];
  }

  private initConfetti() {
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4'];
    this.particles = Array.from({ length: 50 }, (_, i) => {
      const isCircle = Math.random() > 0.5;
      return {
        id: i,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: `${Math.random() * 2}s`,
        duration: `${2 + Math.random() * 3}s`,
        size: `${6 + Math.random() * 8}px`,
        borderRadius: isCircle ? '50%' : '2px'
      };
    });
  }

  handleRestart() {
    this.restart.emit();
  }

  handleContinue() {
    this.continue.emit();
  }
}
