import { QuizStatus } from './Quiz';

export enum Role {
  STUDENT = 'student',
  TEACHER = 'teacher',
}

export type User = Student | Teacher;

type UserCommon = {
  lineUserId: string;
  name: string;
};

export type QuizInfoInUser = {
  quizId: string;
  label: string;
  time: number;
  status: QuizStatus;
  startTime: number | null;
};

export type TeacherInfoInStudent = {
  teacherId: string;
  name: string;
  classroom: string;
  quizes: QuizInfoInUser[];
  score: {
    field: string;
    total: number;
    count: number;
  }[];
};

type Student = UserCommon & {
  role: Role.STUDENT;
  teachers?: TeacherInfoInStudent[];
};

export type StudentInfoInTeacher = {
  studentId: string;
  name: string;
  quizes: QuizInfoInUser[];
  score: {
    field: string;
    total: number;
    count: number;
  }[];
};

type Teacher = UserCommon & {
  role: Role.TEACHER;
  spreadsheetId: string;
  classroom: string;
  students?: StudentInfoInTeacher[];
};

export type UpdateUserParams = {
  name?: string;
  spreadsheetId?: string;
  classroom?: string;
};
