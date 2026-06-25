export type Screen = 'setup' | 'loading' | 'quiz' | 'results';

export type AnswerLetter = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Question {
  id: number;
  stem: string;
  options: Record<AnswerLetter, string>;
  correct: AnswerLetter;
  explanation: string;
}

export interface Answer {
  chosen: AnswerLetter;
  correct: AnswerLetter;
  ok: boolean;
}
