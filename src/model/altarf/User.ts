import { DbKey } from 'src/model/DbKey';
import { QuizInfo } from './Quiz';

export enum Role {
  STUDENT = 'student',
  TEACHER = 'teacher',
}

export type User = Student | Teacher;

type UserCommon = {
  lineUserId: string;
  name: string;
};

export type Student = UserCommon & {
  role: Role.STUDENT;
  quizes: QuizInfo[];
  score: Score[];
};

export type Teacher = UserCommon & {
  role: Role.TEACHER;
  spreadsheetId: string;
  myStudents: (DbKey & Student)[];
};

export type UpdateUserParams = {
  name?: string;
  spreadsheetId?: string;
};

type Score = {
  subject: 'math';
  field: Field[];
};

type Field = {
  name: string;
  count: number;
  total: number;
};
