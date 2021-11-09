import { bindings } from 'src/bindings';
import {
  DbQuiz,
  QuestionType,
  QuizValidateResponse,
  QuizValidateResponseStatus,
} from 'src/model/altarf/Quiz';
import { Role } from 'src/model/altarf/User';
import { AltarfEntity } from 'src/model/DbKey';
import { DbUser } from 'src/model/User';
import { Validator } from 'src/Validator';
import { DbServiceBak } from './DbServiceBak';
import { GoogleSheetService } from './GoogleSheetService';
import { QuizService } from './QuizService';
import { AltarfUserService } from './users/AltarfUserService';

/**
 * Tests of the QuizService class.
 */
describe('QuizService', () => {
  let quizService: QuizService;
  let mockGooglesheetService: any;
  let mockAltarfUserService: any;
  let mockDbService: any;
  let mockValidator: any;
  let dummyGoodQuestionRow: unknown[];
  let dummyGoodResult: QuizValidateResponse;
  let dummyBadQuestionRow: unknown[];
  let dummyBadResult: QuizValidateResponse;
  let dummyDbTeacher: DbUser;
  let dummyDbStudent: DbUser;
  let dummyDbQuiz: DbQuiz;

  beforeAll(() => {
    dummyDbQuiz = {
      projectEntity: AltarfEntity.quiz,
      creationId: 'quiz',
      owner: 'me',
      label: 'aaa',
      questions: [],
      time: 30,
    };
    dummyGoodQuestionRow = [
      {
        question: 'a',
        type: QuestionType.SINGLE,
        options: '1',
        answer: '1',
        field: 'N',
      },
    ];
    dummyBadQuestionRow = [
      {
        question: 'a',
        type: QuestionType.SINGLE,
        options: '1',
        answer: '1',
        field: 'N',
      },
      {},
      {
        question: 'b',
        type: 'wrong',
        options: 'text',
        answer: 'text',
        field: 'N',
      },
      {
        question: 'c',
        type: QuestionType.SINGLE,
        options: '-1',
        answer: '-1,2',
        field: 'N',
      },
    ];
    dummyGoodResult = {
      status: QuizValidateResponseStatus.OK,
      content: [],
    };
    dummyBadResult = {
      status: QuizValidateResponseStatus.NEED_MORE_WORK,
      content: [],
    };
    dummyDbStudent = {
      projectEntity: AltarfEntity.user,
      creationId: 'studentId',
      lineUserId: 'lineId',
      name: 'student',
      role: Role.STUDENT,
      quizes: [],
      score: [],
    };
    dummyDbTeacher = {
      projectEntity: AltarfEntity.user,
      creationId: 'teacherId',
      lineUserId: 'lineId',
      name: 'tester',
      role: Role.TEACHER,
      spreadsheetId: '12345',
      myStudents: [dummyDbStudent],
    };
  });

  beforeEach(() => {
    mockGooglesheetService = { getRows: jest.fn(() => dummyGoodQuestionRow) };
    mockAltarfUserService = {
      getUserByLineId: jest.fn(() => dummyDbTeacher),
      getUserById: jest.fn(() => dummyDbStudent),
    };
    mockDbService = {
      putItem: jest.fn(),
      putItems: jest.fn(),
      getItem: jest.fn(() => dummyDbQuiz),
    };
    mockValidator = {
      validateAssignQuizParams: jest.fn(),
      validateSaveQuizParams: jest.fn(),
    };

    bindings
      .rebind<GoogleSheetService>(GoogleSheetService)
      .toConstantValue(mockGooglesheetService);
    bindings
      .rebind<AltarfUserService>(AltarfUserService)
      .toConstantValue(mockAltarfUserService);
    bindings.rebind<DbServiceBak>(DbServiceBak).toConstantValue(mockDbService);
    bindings.rebind<Validator>(Validator).toConstantValue(mockValidator);

    quizService = bindings.get<QuizService>(QuizService);
  });

  it('save should return OK', async () => {
    const res = await quizService.save('lineId', 'sheetId', {
      label: 'b',
      time: 30,
    });
    expect(res.status).toBe(dummyGoodResult.status);
  });

  it('save should return NEED_MORE_WORK', async () => {
    mockGooglesheetService.getRows = jest.fn(() => dummyBadQuestionRow);
    const res = await quizService.save('lineId', 'sheetId', {
      label: 'a',
      time: 30,
    });
    expect(res.status).toBe(dummyBadResult.status);
  });

  it('assign should work', async () => {
    await quizService.assign('lineId', {
      studentId: ['studentId'],
      quizId: [dummyDbQuiz.creationId],
    });
    expect(mockDbService.putItems).toHaveBeenCalledTimes(1);
  });

  it('assign should fail with wrong role', async () => {
    mockAltarfUserService.getUserById = jest.fn(() => dummyDbTeacher);

    await expect(
      quizService.assign('lineId', {
        studentId: ['studentId'],
        quizId: [dummyDbQuiz.creationId],
      })
    ).rejects.toThrow('role of studentId is not student');

    mockAltarfUserService.getUserByLineId = jest.fn(() => dummyDbStudent);
    mockAltarfUserService.getUserById = jest.fn(() => dummyDbStudent);

    await expect(
      quizService.assign('lineId', {
        studentId: ['studentId'],
        quizId: [dummyDbQuiz.creationId],
      })
    ).rejects.toThrow('role of lineId is not teacher');
  });

  it('assign should fail if teacher does not teach input student', async () => {
    mockAltarfUserService.getUserByLineId = jest.fn(() => ({
      ...dummyDbTeacher,
      students: [
        {
          studentId: 'studentIdaa',
          name: 'aaa',
          quizes: [],
          score: [],
        },
      ],
    }));

    await expect(
      quizService.assign('lineId', {
        studentId: ['student'],
        quizId: [dummyDbQuiz.creationId],
      })
    ).rejects.toThrow(
      `teacher ${dummyDbTeacher.creationId} does not teach student student`
    );
  });

  it('assign should fail if quiz has been assigned to student', async () => {
    mockAltarfUserService.getUserById = jest.fn(() => ({
      ...dummyDbStudent,
      teachers: [
        {
          teacherId: 'teacherId',
          name: 'aaa',
          quizes: [{ quizId: 'quiz' }],
          score: [],
        },
      ],
    }));

    await expect(
      quizService.assign('lineId', {
        studentId: ['studentId'],
        quizId: [dummyDbQuiz.creationId],
      })
    ).rejects.toThrow(
      `student studentId has already assigned quiz ${dummyDbQuiz.creationId}`
    );
  });
});
