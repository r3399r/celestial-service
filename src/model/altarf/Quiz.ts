import { GoogleSpreadsheetRow } from 'google-spreadsheet';
import { DbKey } from 'src/model/DbKey';

export enum QuestionType {
  SINGLE = 'S',
  MULTIPLE = 'M',
  FILL_IN_BLANK = 'B',
}

export enum QuizStatus {
  TODO = 'todo',
  TESTING = 'testing',
  DONE = 'done',
}

export enum QuizValidateResponseStatus {
  OK = 'OK',
  NEED_MORE_WORK = 'NEED_MORE_WORK',
}

export type QuizValidate = {
  line: number;
  reason: string;
};

export type QuizValidateResponse = {
  status: QuizValidateResponseStatus;
  content: QuizValidate[];
};

export type QuizRow = {
  id: string;
  question?: string;
  type?: QuestionType;
  options?: string;
  answer?: string;
  image?: string;
  field?: string;
};

export type SpreadsheetQuizRow = GoogleSpreadsheetRow & QuizRow;

export type Quiz = {
  owner: string;
  label: string;
  time: number;
  questions: QuizRow[];
};
export type DbQuiz = DbKey & Quiz;

export type SaveQuizParams = {
  label: string;
  time: number;
};

export type AssignQuizParams = {
  studentId: string[];
  quizId: string[];
};

export type QuizInfo = {
  quizId: string;
  label: string;
  status: QuizStatus;
};

export type QuizResult = {
  quizId: string;
  testerId: string;
  startTime: number;
  status: QuizStatus;
  results: {
    id: string;
    answerOfTester: string;
  }[];
};

export type DbQuizResult = DbKey & QuizResult;
