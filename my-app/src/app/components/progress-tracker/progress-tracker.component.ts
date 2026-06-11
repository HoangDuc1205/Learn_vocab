import { Component, Input, computed, input } from '@angular/core';

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
export class ProgressTrackerComponent {
  words = input<Word[]>([]);
  @Input() totalQuestions: number = 0;
  @Input() answeredQuestions: number = 0;

  stats = computed(() => {
    const words = this.words();
    const total = words.length;
    const notLearned = words.filter(w => w.status === 'not_learned').length;
    const inProgress = words.filter(w => IN_PROGRESS_STATUSES.includes(w.status)).length;
    const mastered = words.filter(w => w.status === 'mastered').length;

    if (total === 0) {
      return {
        total: 0,
        notLearned: 0,
        inProgress: 0,
        mastered: 0,
        overallPct: 0,
        masteredPct: 0,
        inProgressPct: 0,
        notLearnedPct: 0
      };
    }

    let currentScore = 0;
    words.forEach(w => {
      if (w.status === 'mastered') currentScore += 5;
      else if (w.status === 'synonym_written_passed') currentScore += 4;
      else if (w.status === 'synonym_mc_passed') currentScore += 3;
      else if (w.status === 'written_passed') currentScore += 2;
      else if (w.status === 'familiar') currentScore += 1;
    });
    const maxScore = total * 5;

    return {
      total,
      notLearned,
      inProgress,
      mastered,
      overallPct: Math.round((currentScore / maxScore) * 100),
      masteredPct: (mastered / total) * 100,
      inProgressPct: (inProgress / total) * 100,
      notLearnedPct: (notLearned / total) * 100
    };
  });
}
