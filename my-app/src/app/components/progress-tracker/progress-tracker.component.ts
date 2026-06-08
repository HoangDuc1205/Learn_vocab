import { Component, Input, OnChanges, ChangeDetectorRef } from '@angular/core';

export type WordStatus =
  | 'not_learned'
  | 'familiar'
  | 'written_passed'
  | 'synonym_mc_passed'
  | 'synonym_written_passed'
  | 'mastered';

export function hasSynonym(word: Word): boolean {
  return word.synonym.trim().length > 0;
}

export interface Word {
  id: number;
  term: string;
  definition: string;
  synonym: string;
  ipa?: string;
  status: WordStatus;
  consecutiveCorrect: number;
  totalCorrect: number;
  totalWrong: number;
}

const IN_PROGRESS_STATUSES: WordStatus[] = [
  'familiar',
  'written_passed',
  'synonym_mc_passed',
  'synonym_written_passed'
];

@Component({
  selector: 'app-progress-tracker',
  templateUrl: './progress-tracker.component.html',
  styleUrl: './progress-tracker.component.css',
  standalone: false
})
export class ProgressTrackerComponent implements OnChanges {
  @Input() words: Word[] = [];
  @Input() totalQuestions: number = 0;
  @Input() answeredQuestions: number = 0;

  notLearned = 0;
  inProgress = 0;
  mastered = 0;
  total = 0;

  masteredPct = 0;
  inProgressPct = 0;
  notLearnedPct = 0;
  overallPct = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges() {
    this.total = this.words.length;
    this.notLearned = this.words.filter(w => w.status === 'not_learned').length;
    this.inProgress = this.words.filter(w => IN_PROGRESS_STATUSES.includes(w.status)).length;
    this.mastered = this.words.filter(w => w.status === 'mastered').length;

    if (this.total > 0) {
      let currentScore = 0;
      this.words.forEach(w => {
        if (w.status === 'mastered') currentScore += 5;
        else if (w.status === 'synonym_written_passed') currentScore += 4;
        else if (w.status === 'synonym_mc_passed') currentScore += 3;
        else if (w.status === 'written_passed') currentScore += 2;
        else if (w.status === 'familiar') currentScore += 1;
      });
      const maxScore = this.total * 5;
      this.overallPct = Math.round((currentScore / maxScore) * 100);

      this.masteredPct = (this.mastered / this.total) * 100;
      this.inProgressPct = (this.inProgress / this.total) * 100;
      this.notLearnedPct = (this.notLearned / this.total) * 100;
    } else {
      this.overallPct = 0;
      this.masteredPct = 0;
      this.inProgressPct = 0;
      this.notLearnedPct = 0;
    }
    this.cdr.detectChanges();
  }
}
