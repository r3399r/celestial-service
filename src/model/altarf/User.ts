import { DbKey } from 'src/model/DbKey';
import { Quiz } from './Quiz';

export enum Role {
  STUDENT = 'student',
  TEACHER = 'teacher',
}

export type User = Student | Teacher;

type UserCommon = {
  lineUserId: string;
  name: string;
};

type TeacherInfoInStudent = {
  teacherId: string;
  name: string;
  classroom: string;
  quizes: {
    quizId: string;
    label: string;
    time: number;
    status: string;
  }[];
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

type StudentInfoInTeacher = {
  studentId: string;
  name: string;
  quizes: {
    quizId: string;
    label: string;
    time: number;
    status: string;
  }[];
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

type TeacherStudentPair = {
  teacherId: string;
  studentId: string;
  quizes?: Quiz[];
};

export type DbTeacherStudentPair = DbKey & TeacherStudentPair;

export type MeTeacher = Teacher & {
  id: string;
  students: {
    studentId: string;
    name: string;
    quizes?: (Quiz & { label: string })[];
  }[];
};

export type MeStudent = Student & {
  id: string;
  teachers: {
    teacherId: string;
    name: string;
    quizes?: (Quiz & { label: string })[];
  }[];
};
