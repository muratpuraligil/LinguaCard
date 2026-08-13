export interface Word {
  id: string;
  english: string;
  turkish: string;
  example_sentence: string;
  turkish_sentence: string;
  created_at?: string;
  user_id?: string | null;
  set_name?: string; 
  is_archived?: boolean;
  category?: string;
  word_type?: string;
}

export enum AppMode {
  HOME = 'HOME',
  FLASHCARDS = 'FLASHCARDS',
  QUIZ = 'QUIZ',
  SENTENCES = 'SENTENCES',
  CUSTOM_SETS = 'CUSTOM_SETS',
  CUSTOM_SET_STUDY = 'CUSTOM_SET_STUDY',
  ARCHIVE = 'ARCHIVE',
  LIBRARY = 'LIBRARY',
  LIBRARY_PRACTICE = 'LIBRARY_PRACTICE'
}

export type FlashcardStudyMode = 'USER_WORDS' | 'AI_ADD' | 'LIBRARY';

export type LibraryLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type WordProgressStatus = 'known' | 'learning' | 'unlearned';

export interface UserWordProgress {
  word_id: string;
  user_id: string;
  status: WordProgressStatus;
  module: string;
}

export enum LanguageDirection {
  EN_TR = 'EN_TR',
  TR_EN = 'TR_EN'
}

export enum LanguageLocale {
  EN = 'en-US',
  TR = 'tr-TR'
}

export enum AuthProvider {
  GOOGLE = 'google'
}

export interface QuizQuestion {
  questionWord: Word;
  options: string[];
  correctAnswer: string;
}

export type OcrStatus = 'IDLE' | 'PREPARING' | 'CONNECTING' | 'ANALYZING';

export interface LibrarySentence {
  id: string;
  turkish: string;
  english: string;
  sourceSetTitle?: string;
}

export interface LibrarySet {
  id: string;
  title: string;
  sentences: LibrarySentence[];
}

export interface LibraryCategory {
  title: string;
  sets: LibrarySet[];
}
