import { Component, signal, computed, effect, ChangeDetectorRef, OnInit } from '@angular/core';
import { hasSynonym, Word } from './components/progress-tracker/progress-tracker.component';
import { TransitionPhase } from './components/phase-transition/phase-transition.component';
import {
  BUNDLED_VOCAB_FINGERPRINT,
  getBundledVocabulary,
  resolveInitialAppState,
  savePersistedState,
  STORAGE_VERSION,
  syncWordsWithSource
} from './vocabulary-storage';
import {
  advanceWordsWithoutSynonym,
  buildTestSummaries,
  CHUNK_SIZE,
  clampTestIndex,
  getActiveChunk,
  getChunkRangeLabel,
  getTestPhase,
  getTestPhaseLabel,
  isChunkComplete,
  TestPhase,
  TestSummary
} from './test-utils';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type VocabInput = { term: string; definition: string; synonym?: string };
type BatchPhase = TestPhase;
type QuestionType = 'mc' | 'written' | 'synonym_mc' | 'synonym_written' | 'vocab';

function initWords(vocab: VocabInput[]): Word[] {
  return vocab.map((v, i) => ({
    id: i,
    term: v.term,
    definition: v.definition,
    synonym: v.synonym?.trim() ?? '',
    status: 'not_learned' as const,
    consecutiveCorrect: 0,
    totalCorrect: 0,
    totalWrong: 0
  }));
}

const SESSION_SIZE = CHUNK_SIZE;
const MIN_CHOICES = 4;

const initialAppState = resolveInitialAppState();

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: false
})
export class App implements OnInit {
  // Signals for state
  words = signal<Word[]>(initialAppState.words);
  dark = signal<boolean>(false);
  queue = signal<number[]>([]);
  currentIdx = signal<number>(0);
  view = signal<'start' | 'learn' | 'phase_transition' | 'session_complete' | 'all_complete'>('start');
  sessionWords = signal<Word[]>([]);
  transitionWords = signal<Word[]>([]);
  transitionPhase = signal<TransitionPhase>('mc_to_written');
  sessionRound = signal<BatchPhase | null>(null);
  totalAnswered = signal<number>(initialAppState.totalAnswered);
  totalCorrect = signal<number>(initialAppState.totalCorrect);
  showImportModal = signal<boolean>(false);
  questionKey = signal<number>(0);
  roundText = signal<string>('');
  selectedTestIndex = signal<number>(initialAppState.selectedTestIndex);
  vocabSyncNotice = signal<string | null>(
    initialAppState.syncedFromFile
      ? `Đã đồng bộ ${initialAppState.words.length} từ từ vocabulary.json (giữ tiến độ từ đã học).`
      : null
  );

  tests = computed(() => buildTestSummaries(this.words()));

  selectedTest = computed((): TestSummary | null => {
    const list = this.tests();
    const idx = this.selectedTestIndex();
    return list[idx] ?? list[0] ?? null;
  });

  activeBatch = computed(() => this.selectedTest()?.words ?? []);

  activeChunk = computed(() => getActiveChunk(this.activeBatch()));

  activeChunkLabel = computed(() => getChunkRangeLabel(this.activeBatch()));

  selectedTestNum = computed(() => (this.selectedTest()?.number ?? 1));

  activeBatchPhase = computed((): BatchPhase => {
    const phase = getTestPhase(this.activeChunk());
    return phase === 'complete' ? 'vocab' : phase;
  });

  private chunkIdSet(chunk: Word[]): Set<number> {
    return new Set(chunk.map(w => w.id));
  }

  activeBatchPhaseText = computed(() => getTestPhaseLabel(getTestPhase(this.activeChunk())));

  isSelectedTestComplete = computed(() => this.selectedTest()?.isComplete ?? false);

  isActiveChunkComplete = computed(() => isChunkComplete(this.activeChunk()));

  constructor(private cdr: ChangeDetectorRef) {
    // Check local preferences for theme
    if (typeof window !== 'undefined') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.dark.set(isDark);
    }

    // Effect to toggle dark class on body
    effect(() => {
      document.body.classList.toggle('dark', this.dark());
      this.cdr.detectChanges();
    });

    // Persist vocabulary + progress to localStorage
    effect(() => {
      savePersistedState({
        version: STORAGE_VERSION,
        words: this.words(),
        totalAnswered: this.totalAnswered(),
        totalCorrect: this.totalCorrect(),
        selectedTestIndex: this.selectedTestIndex(),
        sourceFingerprint: BUNDLED_VOCAB_FINGERPRINT
      });
    });
  }

  ngOnInit() {
    this.selectedTestIndex.set(
      clampTestIndex(this.selectedTestIndex(), this.words().length)
    );
    this.cdr.detectChanges();
  }

  // Computed properties
  currentWord = computed(() => {
    const q = this.queue();
    const idx = this.currentIdx();
    if (q.length === 0 || idx >= q.length) return null;
    return this.words().find(w => w.id === q[idx]) || null;
  });

  choices = computed(() => {
    const word = this.currentWord();
    if (!word) return [];

    const correct = word.definition;
    const others = this.activeChunk()
      .filter(w => w.id !== word.id)
      .map(w => w.definition);

    const distractors = shuffle(others).slice(0, MIN_CHOICES - 1);
    return shuffle([correct, ...distractors]);
  });

  synonymChoices = computed(() => {
    const word = this.currentWord();
    if (!word || !hasSynonym(word)) return [];

    const correct = word.synonym;
    const others = this.activeChunk()
      .filter(w => w.id !== word.id && hasSynonym(w))
      .map(w => w.synonym);

    const distractors = shuffle(others).slice(0, MIN_CHOICES - 1);
    return shuffle([correct, ...distractors]);
  });

  questionType = computed((): QuestionType => {
    const word = this.currentWord();
    if (!word) return 'mc';
    switch (word.status) {
      case 'familiar':
        return 'written';
      case 'written_passed':
        return 'synonym_mc';
      case 'synonym_mc_passed':
        return 'synonym_written';
      case 'synonym_written_passed':
        return 'vocab';
      default:
        return 'mc';
    }
  });

  vocabCorrectAnswer = computed(() => this.currentWord()?.term ?? '');

  vocabAlternateAnswers = computed(() => []);

  sessionProgress = computed(() => {
    const q = this.queue();
    if (q.length === 0) return 0;
    return Math.round((this.currentIdx() / q.length) * 100);
  });

  // Methods
  toggleTheme() {
    this.dark.update(d => !d);
    this.cdr.detectChanges();
  }

  buildSession(batchWords: Word[]): Word[] {
    const notLearned = batchWords.filter(w => w.status === 'not_learned');
    if (notLearned.length > 0) {
      return shuffle(notLearned).slice(0, SESSION_SIZE);
    }

    const familiar = batchWords.filter(w => w.status === 'familiar');
    if (familiar.length > 0) {
      return shuffle(familiar).slice(0, SESSION_SIZE);
    }

    const synonymMc = batchWords.filter(w => w.status === 'written_passed' && hasSynonym(w));
    if (synonymMc.length > 0) {
      return shuffle(synonymMc).slice(0, SESSION_SIZE);
    }

    const synonymWritten = batchWords.filter(w => w.status === 'synonym_mc_passed');
    if (synonymWritten.length > 0) {
      return shuffle(synonymWritten).slice(0, SESSION_SIZE);
    }

    const vocabRound = batchWords.filter(w => w.status === 'synonym_written_passed');
    if (vocabRound.length > 0) {
      return shuffle(vocabRound).slice(0, SESSION_SIZE);
    }

    return [];
  }

  private prepareChunkForSession(chunk: Word[]) {
    const ids = this.chunkIdSet(chunk);
    this.words.update(prev => advanceWordsWithoutSynonym(prev, ids));
  }

  private phaseLabel(phase: BatchPhase): string {
    switch (phase) {
      case 'mc':
        return 'TN định nghĩa';
      case 'written':
        return 'TL định nghĩa';
      case 'synonym_mc':
        return 'TN synonym';
      case 'synonym_written':
        return 'TL synonym';
      case 'vocab':
        return 'Nhập từ';
      default:
        return '';
    }
  }

  private phaseRoundNumber(phase: BatchPhase): string {
    switch (phase) {
      case 'mc':
        return '1';
      case 'written':
        return '2';
      case 'synonym_mc':
        return '3';
      case 'synonym_written':
        return '4';
      case 'vocab':
        return '5';
      default:
        return '';
    }
  }

  selectTest(index: number) {
    this.selectedTestIndex.set(clampTestIndex(index, this.words().length));
    this.cdr.detectChanges();
  }

  startSession() {
    const testWords = this.activeBatch();
    const chunk = this.activeChunk();

    if (testWords.length === 0 || chunk.length === 0) {
      this.cdr.detectChanges();
      return;
    }

    if (testWords.every(w => w.status === 'mastered')) {
      this.view.set('start');
      this.cdr.detectChanges();
      return;
    }

    if (isChunkComplete(chunk)) {
      this.view.set('start');
      this.cdr.detectChanges();
      return;
    }

    this.prepareChunkForSession(chunk);
    const session = this.buildSession(this.activeChunk());
    if (session.length === 0) {
      this.view.set('start');
      this.cdr.detectChanges();
      return;
    }

    const round = this.activeBatchPhase();
    this.sessionRound.set(round);
    this.queue.set(session.map(w => w.id));
    this.currentIdx.set(0);
    this.sessionWords.set(session);
    this.view.set('learn');
    this.questionKey.update(k => k + 1);

    const testNum = this.selectedTestNum();
    const totalInQueue = session.length;
    this.roundText.set(
      `Test ${testNum} · ${this.activeChunkLabel()} • Vòng ${this.phaseRoundNumber(round)}: ${this.phaseLabel(round)} (${totalInQueue} từ)`
    );
    this.cdr.detectChanges();
  }

  handleAnswer(ans: { isCorrect: boolean; selected?: string; value?: string }) {
    const word = this.currentWord();
    if (!word) return;

    this.totalAnswered.update(a => a + 1);
    if (ans.isCorrect) {
      this.totalCorrect.update(c => c + 1);
    }

    const qType = this.questionType();

    this.words.update(prev => {
      return prev.map(w => {
        if (w.id !== word.id) return w;

        let newConsec = ans.isCorrect ? w.consecutiveCorrect + 1 : 0;
        let newStatus = w.status;
        const newCorrect = w.totalCorrect + (ans.isCorrect ? 1 : 0);
        const newWrong = w.totalWrong + (ans.isCorrect ? 0 : 1);

        if (ans.isCorrect) {
          if (qType === 'mc' && w.status === 'not_learned') {
            newStatus = 'familiar';
            newConsec = 1;
          } else if (qType === 'written' && w.status === 'familiar' && newConsec >= 2) {
            newStatus = 'written_passed';
            newConsec = 0;
          } else if (qType === 'synonym_mc' && w.status === 'written_passed') {
            newStatus = 'synonym_mc_passed';
            newConsec = 1;
          } else if (qType === 'synonym_written' && w.status === 'synonym_mc_passed' && newConsec >= 2) {
            newStatus = 'synonym_written_passed';
            newConsec = 0;
          } else if (qType === 'vocab' && w.status === 'synonym_written_passed' && newConsec >= 2) {
            newStatus = 'mastered';
            newConsec = 2;
          }
        } else {
          if (qType === 'written' && w.status === 'familiar') {
            newStatus = 'not_learned';
          } else if (qType === 'synonym_mc' && w.status === 'written_passed') {
            newStatus = 'written_passed';
          } else if (qType === 'synonym_written' && w.status === 'synonym_mc_passed') {
            newStatus = 'written_passed';
          } else if (qType === 'vocab' && w.status === 'synonym_written_passed') {
            newStatus = 'synonym_mc_passed';
          }
          newConsec = 0;
        }

        return {
          ...w,
          status: newStatus,
          consecutiveCorrect: newConsec,
          totalCorrect: newCorrect,
          totalWrong: newWrong
        };
      });
    });

    // If incorrect, recycle this item inside active queue
    if (!ans.isCorrect) {
      this.queue.update(prev => {
        const nextQueue = [...prev];
        const insertAt = Math.min(this.currentIdx() + 3, nextQueue.length);
        nextQueue.splice(insertAt, 0, word.id);
        return nextQueue;
      });
    }

    const q = this.queue();
    const nextIdx = this.currentIdx() + 1;

    // Advance viewport or complete session
    if (nextIdx < q.length) {
      this.currentIdx.set(nextIdx);
      this.questionKey.update(k => k + 1);
    } else {
      const testWords = this.activeBatch();
      const chunk = this.activeChunk();
      const testComplete = testWords.length > 0 && testWords.every(w => w.status === 'mastered');
      const chunkDone = isChunkComplete(chunk);
      const allMastered = this.words().every(w => w.status === 'mastered');

      if (testComplete) {
        this.view.set(allMastered ? 'all_complete' : 'session_complete');
      } else if (chunkDone) {
        this.view.set('session_complete');
      } else {
        const round = this.sessionRound();

        if (round === 'mc' && chunk.some(w => w.status === 'familiar')) {
          this.transitionPhase.set('mc_to_written');
          this.transitionWords.set(chunk.filter(w => w.status === 'familiar'));
          this.view.set('phase_transition');
        } else if (round === 'written' && chunk.some(w => w.status === 'written_passed')) {
          this.prepareChunkForSession(chunk);
          const updated = this.activeChunk();
          const withSyn = updated.filter(w => w.status === 'written_passed' && hasSynonym(w));
          const skipToVocab = updated.filter(w => w.status === 'synonym_written_passed');

          if (withSyn.length > 0) {
            this.transitionPhase.set('written_to_synonym_mc');
            this.transitionWords.set(withSyn);
            this.view.set('phase_transition');
          } else if (skipToVocab.length > 0) {
            this.transitionPhase.set('synonym_written_to_vocab');
            this.transitionWords.set(skipToVocab);
            this.view.set('phase_transition');
          } else {
            this.view.set('session_complete');
          }
        } else if (round === 'synonym_mc' && chunk.some(w => w.status === 'synonym_mc_passed')) {
          this.transitionPhase.set('synonym_mc_to_synonym_written');
          this.transitionWords.set(chunk.filter(w => w.status === 'synonym_mc_passed'));
          this.view.set('phase_transition');
        } else if (round === 'synonym_written' && chunk.some(w => w.status === 'synonym_written_passed')) {
          this.transitionPhase.set('synonym_written_to_vocab');
          this.transitionWords.set(chunk.filter(w => w.status === 'synonym_written_passed'));
          this.view.set('phase_transition');
        } else {
          this.view.set('session_complete');
        }
      }
    }
    this.cdr.detectChanges();
  }

  handleDontKnow() {
    this.handleAnswer({ isCorrect: false });
    this.cdr.detectChanges();
  }

  handleImport(vocab: VocabInput[]) {
    const newWords = initWords(vocab);
    this.words.set(newWords);
    this.selectedTestIndex.set(0);
    this.queue.set([]);
    this.currentIdx.set(0);
    this.view.set('start');
    this.totalAnswered.set(0);
    this.totalCorrect.set(0);
    this.sessionWords.set([]);
    this.cdr.detectChanges();
  }

  handleRestart() {
    this.words.update(prev => prev.map(w => ({
      ...w,
      status: 'not_learned',
      consecutiveCorrect: 0,
      totalCorrect: 0,
      totalWrong: 0
    })));
    this.queue.set([]);
    this.currentIdx.set(0);
    this.view.set('start');
    this.totalAnswered.set(0);
    this.totalCorrect.set(0);
    this.sessionWords.set([]);
    this.cdr.detectChanges();
  }

  handleContinue() {
    if (this.isSelectedTestComplete()) {
      this.view.set('start');
    } else if (this.isActiveChunkComplete()) {
      this.view.set('start');
    } else {
      this.startSession();
    }
    this.cdr.detectChanges();
  }

  startNextRound() {
    this.startSession();
    this.cdr.detectChanges();
  }

  syncFromBundledJson() {
    const source = getBundledVocabulary();
    const merged = syncWordsWithSource(this.words(), source);
    this.words.set(merged);
    this.selectedTestIndex.set(clampTestIndex(this.selectedTestIndex(), merged.length));
    this.queue.set([]);
    this.currentIdx.set(0);
    this.view.set('start');
    this.sessionWords.set([]);
    this.vocabSyncNotice.set(
      `Đã đồng bộ ${merged.length} từ từ vocabulary.json (giữ tiến độ các từ trùng tên).`
    );
    this.closeImport();
    this.cdr.detectChanges();
  }

  dismissSyncNotice() {
    this.vocabSyncNotice.set(null);
    this.cdr.detectChanges();
  }

  readonly bundledVocabCount = getBundledVocabulary().length;

  goHome() {
    this.queue.set([]);
    this.currentIdx.set(0);
    this.sessionWords.set([]);
    this.view.set('start');
    this.cdr.detectChanges();
  }

  openImport() {
    this.showImportModal.set(true);
    this.cdr.detectChanges();
  }

  closeImport() {
    this.showImportModal.set(false);
    this.cdr.detectChanges();
  }
}
