import { hasSynonym, Word, WordStatus } from './components/progress-tracker/progress-tracker.component';

export function getWordScore(w: Word): number {
  if (w.status === 'mastered') return 5;
  if (w.status === 'synonym_written_passed') return 4;
  if (w.status === 'synonym_mc_passed') return 3;
  if (w.status === 'written_passed') return 2;
  if (w.status === 'familiar') return 1;
  return 0;
}

export const TEST_SIZE = 50;
/** Mỗi cụm trong test: ~10 từ × các vòng rồi sang cụm tiếp. */
export const CHUNK_SIZE = 10;

export type TestPhase =
  | 'mc'
  | 'written'
  | 'synonym_mc'
  | 'synonym_written'
  | 'vocab'
  | 'complete';

export interface TestSummary {
  index: number;
  number: number;
  words: Word[];
  total: number;
  mastered: number;
  progressPct: number;
  isComplete: boolean;
  phase: TestPhase;
  phaseLabel: string;
}

export function getTestSlice(allWords: Word[], testIndex: number): Word[] {
  const start = testIndex * TEST_SIZE;
  return allWords.slice(start, Math.min(start + TEST_SIZE, allWords.length));
}

export function getTestCount(wordCount: number): number {
  return wordCount === 0 ? 0 : Math.ceil(wordCount / TEST_SIZE);
}

export function getTestPhase(words: Word[]): TestPhase {
  if (words.length === 0) return 'mc';
  if (words.every(w => w.status === 'mastered')) return 'complete';
  if (words.some(w => w.status === 'not_learned')) return 'mc';
  if (words.some(w => w.status === 'familiar')) return 'written';
  if (words.some(w => w.status === 'written_passed')) return 'synonym_mc';
  if (words.some(w => w.status === 'synonym_mc_passed')) return 'synonym_written';
  if (words.some(w => w.status === 'synonym_written_passed')) return 'vocab';
  return 'vocab';
}

export function getTestPhaseLabel(phase: TestPhase): string {
  switch (phase) {
    case 'mc':
      return 'Vòng 1: Trắc nghiệm định nghĩa';
    case 'written':
      return 'Vòng 2: Tự luận định nghĩa';
    case 'synonym_mc':
      return 'Vòng 3: Trắc nghiệm synonym';
    case 'synonym_written':
      return 'Vòng 4: Tự luận synonym';
    case 'vocab':
      return 'Vòng 5: Nhập từ (định nghĩa → từ)';
    case 'complete':
      return 'Hoàn thành';
  }
}

export function buildTestSummaries(allWords: Word[]): TestSummary[] {
  const count = getTestCount(allWords.length);
  return Array.from({ length: count }, (_, index) => {
    const testWords = getTestSlice(allWords, index);
    const mastered = testWords.filter(w => w.status === 'mastered').length;
    const total = testWords.length;
    const phase = getTestPhase(testWords);

    const totalScore = testWords.reduce((sum, w) => sum + getWordScore(w), 0);
    const maxScore = total * 5;

    return {
      index,
      number: index + 1,
      words: testWords,
      total,
      mastered,
      progressPct: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
      isComplete: phase === 'complete',
      phase,
      phaseLabel: getTestPhaseLabel(phase)
    };
  });
}

export function clampTestIndex(index: number, wordCount: number): number {
  const max = Math.max(0, getTestCount(wordCount) - 1);
  return Math.min(Math.max(0, index), max);
}

export function getCurrentChunkIndex(testWords: Word[]): number {
  if (testWords.length === 0) return 0;
  const firstIncomplete = testWords.findIndex(w => w.status !== 'mastered');
  if (firstIncomplete === -1) {
    return Math.max(0, Math.ceil(testWords.length / CHUNK_SIZE) - 1);
  }
  return Math.floor(firstIncomplete / CHUNK_SIZE);
}

export function getActiveChunk(testWords: Word[]): Word[] {
  if (testWords.length === 0) return [];
  const chunkIndex = getCurrentChunkIndex(testWords);
  const start = chunkIndex * CHUNK_SIZE;
  return testWords.slice(start, Math.min(start + CHUNK_SIZE, testWords.length));
}

export function getChunkRangeLabel(testWords: Word[], chunkIndex?: number): string {
  if (testWords.length === 0) return '';
  const idx = chunkIndex ?? getCurrentChunkIndex(testWords);
  const start = idx * CHUNK_SIZE + 1;
  const end = Math.min((idx + 1) * CHUNK_SIZE, testWords.length);
  return `Từ ${start}–${end}`;
}

export function isChunkComplete(chunk: Word[]): boolean {
  return chunk.length > 0 && chunk.every(w => w.status === 'mastered');
}

/** Từ không có synonym: bỏ qua vòng 3–4, nhảy thẳng tới vòng 5. */
export function advanceWordsWithoutSynonym(words: Word[], chunkIds: Set<number>): Word[] {
  return words.map(w => {
    if (!chunkIds.has(w.id)) return w;
    if (w.status === 'written_passed' && !hasSynonym(w)) {
      return { ...w, status: 'synonym_written_passed' as WordStatus, consecutiveCorrect: 0 };
    }
    return w;
  });
}
