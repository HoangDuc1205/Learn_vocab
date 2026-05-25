import { Word, WordStatus } from './components/progress-tracker/progress-tracker.component';
import { getTestCount } from './test-utils';
import defaultVocabulary from '../data/vocabulary.json';

const STORAGE_KEY = 'quizlearn-vocabulary';
export const STORAGE_VERSION = 5;

const VALID_STATUSES: WordStatus[] = [
  'not_learned',
  'familiar',
  'written_passed',
  'synonym_mc_passed',
  'synonym_written_passed',
  'mastered'
];

export interface PersistedState {
  version: number;
  words: Word[];
  totalAnswered: number;
  totalCorrect: number;
  selectedTestIndex?: number;
  sourceFingerprint?: string;
}

export interface ResolvedAppState {
  words: Word[];
  totalAnswered: number;
  totalCorrect: number;
  selectedTestIndex: number;
  sourceFingerprint: string;
  syncedFromFile: boolean;
}

type VocabEntry = { term: string; definition: string; synonym?: string };

/** Shape of a word entry saved by storage version 1 */
interface V1StoredWord {
  id: number;
  term: string;
  definition: string;
  status: string;
  consecutiveCorrect: number;
  totalCorrect: number;
  totalWrong: number;
}

export function getBundledVocabulary(): VocabEntry[] {
  return defaultVocabulary as VocabEntry[];
}

/** Fingerprint of bundled vocabulary.json — when it changes, we re-sync on load. */
export function computeVocabFingerprint(vocab: VocabEntry[]): string {
  return vocab
    .map(v => `${v.term.trim().toLowerCase()}\t${v.definition.trim()}\t${(v.synonym ?? '').trim().toLowerCase()}`)
    .join('\n');
}

export const BUNDLED_VOCAB_FINGERPRINT = computeVocabFingerprint(getBundledVocabulary());

export function wordsFromSource(vocab: VocabEntry[]): Word[] {
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

/** Merge bundled JSON with saved progress (matched by term). */
export function syncWordsWithSource(saved: Word[], source: VocabEntry[]): Word[] {
  const progressByTerm = new Map(saved.map(w => [w.term.trim().toLowerCase(), w]));

  return source.map((entry, i) => {
    const key = entry.term.trim().toLowerCase();
    const prev = progressByTerm.get(key);

    if (prev) {
      return {
        ...prev,
        id: i,
        term: entry.term,
        definition: entry.definition,
        synonym: entry.synonym?.trim() ?? prev.synonym ?? ''
      };
    }

    return {
      id: i,
      term: entry.term,
      definition: entry.definition,
      synonym: entry.synonym?.trim() ?? '',
      status: 'not_learned' as const,
      consecutiveCorrect: 0,
      totalCorrect: 0,
      totalWrong: 0
    };
  });
}

const defaultByTerm = new Map(
  getBundledVocabulary().map(v => [v.term.toLowerCase(), v])
);

function lookupSynonym(term: string): string {
  return defaultByTerm.get(term.toLowerCase())?.synonym?.trim() ?? '';
}

function isWord(value: unknown): value is Word {
  if (typeof value !== 'object' || value === null) return false;
  const w = value as Word;
  return (
    typeof w.id === 'number' &&
    typeof w.term === 'string' &&
    typeof w.definition === 'string' &&
    typeof w.synonym === 'string' &&
    VALID_STATUSES.includes(w.status) &&
    typeof w.consecutiveCorrect === 'number' &&
    typeof w.totalCorrect === 'number' &&
    typeof w.totalWrong === 'number'
  );
}

function isV1StoredWord(value: unknown): value is V1StoredWord {
  if (typeof value !== 'object' || value === null) return false;
  const w = value as V1StoredWord;
  return (
    typeof w.id === 'number' &&
    typeof w.term === 'string' &&
    typeof w.definition === 'string' &&
    typeof w.status === 'string' &&
    typeof w.consecutiveCorrect === 'number' &&
    typeof w.totalCorrect === 'number' &&
    typeof w.totalWrong === 'number'
  );
}

function migrateV1Word(raw: V1StoredWord): Word {
  const term = raw.term;
  let migratedStatus: WordStatus;
  if (raw.status === 'mastered') {
    migratedStatus = 'mastered';
  } else if (raw.status === 'familiar') {
    migratedStatus = 'familiar';
  } else if (raw.status === 'written_passed') {
    migratedStatus = 'written_passed';
  } else {
    migratedStatus = 'not_learned';
  }

  return {
    id: raw.id,
    term,
    definition: raw.definition,
    synonym: lookupSynonym(term),
    status: migratedStatus,
    consecutiveCorrect: raw.consecutiveCorrect || 0,
    totalCorrect: raw.totalCorrect || 0,
    totalWrong: raw.totalWrong || 0
  };
}

function parseStoredPayload(data: PersistedState): Word[] | null {
  if (!Array.isArray(data.words)) return null;

  if (data.version === STORAGE_VERSION || data.version === 2 || data.version === 3 || data.version === 4) {
    if (!data.words.every(isWord)) return null;
    return data.words;
  }

  if (data.version === 1) {
    if (!data.words.every(isV1StoredWord)) return null;
    return data.words.map(w => migrateV1Word(w));
  }

  return null;
}

export function loadPersistedState(): PersistedState | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as PersistedState;
    const words = parseStoredPayload(data);
    if (!words) return null;

    const wordCount = words.length;
    const rawIndex = Number(data.selectedTestIndex);
    const selectedTestIndex = Number.isFinite(rawIndex) ? rawIndex : 0;

    return {
      version: STORAGE_VERSION,
      words,
      totalAnswered: Number(data.totalAnswered) || 0,
      totalCorrect: Number(data.totalCorrect) || 0,
      selectedTestIndex: Math.min(Math.max(0, selectedTestIndex), Math.max(0, getTestCount(wordCount) - 1)),
      sourceFingerprint: data.sourceFingerprint ?? ''
    };
  } catch {
    return null;
  }
}

export function resolveInitialAppState(): ResolvedAppState {
  const source = getBundledVocabulary();
  const fingerprint = BUNDLED_VOCAB_FINGERPRINT;
  const saved = loadPersistedState();

  if (!saved) {
    return {
      words: wordsFromSource(source),
      totalAnswered: 0,
      totalCorrect: 0,
      selectedTestIndex: 0,
      sourceFingerprint: fingerprint,
      syncedFromFile: true
    };
  }

  const needsSync = saved.sourceFingerprint !== fingerprint;
  const words = needsSync ? syncWordsWithSource(saved.words, source) : saved.words;
  const wordCount = words.length;

  return {
    words,
    totalAnswered: saved.totalAnswered,
    totalCorrect: saved.totalCorrect,
    selectedTestIndex: Math.min(
      Math.max(0, saved.selectedTestIndex ?? 0),
      Math.max(0, getTestCount(wordCount) - 1)
    ),
    sourceFingerprint: fingerprint,
    syncedFromFile: needsSync
  };
}

export function savePersistedState(state: PersistedState): void {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / private mode errors
  }
}

export function clearPersistedState(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
