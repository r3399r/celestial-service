import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { bindings } from 'src/bindings';
import {
  AssignQuizParams,
  DbQuiz,
  DbQuizResult,
  QuestionType,
  QuizInfo,
  QuizRow,
  QuizStatus,
  QuizValidate,
  QuizValidateResponse,
  QuizValidateResponseStatus,
  SaveQuizParams,
  SpreadsheetQuizRow,
  UpdateQuizParams,
} from 'src/model/altarf/Quiz';
import { Role, Student, Teacher } from 'src/model/altarf/User';
import { AltarfEntity, DbKey } from 'src/model/DbKey';
import { DbUser } from 'src/model/User';
import { GoogleSheetService } from 'src/services/GoogleSheetService';
import { AltarfUserService } from 'src/services/users/AltarfUserService';
import { generateId } from 'src/util/generateId';
import { Validator } from 'src/Validator';
import { DbService } from './DbService';

export const spreadsheetBindingId: symbol = Symbol('spreadsheetId');

/**
 * Service class for quiz in google spreadsheet
 */
@injectable()
export class QuizService {
  @inject(AltarfUserService)
  private readonly userService!: AltarfUserService;

  @inject(DbService)
  private readonly dbService!: DbService;

  @inject(Validator)
  private readonly validator!: Validator;

  public async getQuiz(quizId: string): Promise<DbQuiz> {
    const dbQuiz = await this.dbService.getItem<DbQuiz>({
      projectEntity: AltarfEntity.quiz,
      creationId: quizId,
    });
    if (dbQuiz === null) throw new Error(`quiz ${quizId} does not exist`);

    return dbQuiz;
  }

  private async getQuizResult(
    quizId: string,
    testerId: string,
    quizStatus: QuizStatus = QuizStatus.TESTING
  ): Promise<DbQuizResult[]> {
    return await this.dbService.query<DbQuizResult>(AltarfEntity.quizResult, [
      { key: 'quizId', value: quizId },
      { key: 'testerId', value: testerId },
      { key: 'quizStatus', value: quizStatus },
    ]);
  }

  public async assign(
    lineUserId: string,
    params: AssignQuizParams
  ): Promise<void> {
    this.validator.validateAssignQuizParams(params);

    const teacher = await this.userService.getUserByLineId(lineUserId);
    if (teacher.role !== Role.TEACHER)
      throw new Error(`role of ${lineUserId} is not teacher`);

    const students = await Promise.all(
      params.studentId.map(async (id: string) => {
        const user = await this.userService.getUserById(id);
        if (user.role !== Role.STUDENT)
          throw new Error(`role of ${id} is not student`);

        if (!_(teacher.myStudents).some(['creationId', id]))
          throw new Error(
            `teacher ${teacher.creationId} does not teach student ${id}`
          );

        for (const quizId of params.quizId) {
          const myQuiz = user.quizes.map((quiz: QuizInfo) => quiz.quizId);
          if (myQuiz.includes(quizId))
            throw new Error(
              `student ${user.creationId} has already assigned quiz ${quizId}`
            );
        }

        return user;
      })
    );

    const quizes: DbQuiz[] = await Promise.all(
      params.quizId.map(async (id: string) => await this.getQuiz(id))
    );

    students.map((student: DbUser) => {
      if (student.role !== Role.STUDENT) throw new Error('internal error');

      const studentId = _(teacher.myStudents).findIndex(
        (o: DbUser) => o.creationId === student.creationId
      );

      for (const quiz of quizes) {
        const quizInfo: QuizInfo = {
          quizId: quiz.creationId,
          label: quiz.label,
          quizStatus: QuizStatus.TODO,
        };
        student.quizes.push(quizInfo);
        teacher.myStudents[studentId].quizes.push(quizInfo);
      }
    });

    await this.dbService.putItems<DbUser>([teacher, ...students]);
  }

  public async update(
    lineUserId: string,
    quizId: string,
    params: UpdateQuizParams
  ): Promise<DbQuizResult> {
    const student = await this.userService.getUserByLineId(lineUserId);
    if (student.role !== Role.STUDENT) throw new Error('something went wrong');

    const quiz = await this.getQuiz(quizId);
    const teacher = await this.userService.getUserById(quiz.owner);
    if (teacher.role !== Role.TEACHER) throw new Error('something went wrong');

    const studentIdxInTeacher = teacher.myStudents.findIndex(
      (o: DbUser) => o.creationId === student.creationId
    );
    teacher.myStudents[studentIdxInTeacher] = student;

    const quizResult = await this.getQuizResult(quizId, student.creationId);
    // 無結果表示資料庫中無考試紀錄
    if (quizResult.length === 0)
      return await this.start(student, teacher, quiz);
    if (quizResult.length === 1 && params.complete === undefined)
      return await this.sync(quizResult[0], params);
    if (quizResult.length === 1 && params.complete === true)
      return await this.complete(student, teacher, quizResult[0]);

    throw new Error('unexpected');
  }

  private async complete(
    student: DbKey & Student,
    teacher: DbKey & Teacher,
    quizResult: DbQuizResult
  ): Promise<DbQuizResult> {
    const idx = student.quizes.findIndex(
      (o: QuizInfo) => o.quizId === quizResult.quizId
    );
    student.quizes[idx].quizStatus = QuizStatus.DONE;
    const studentIdxInTeacher = teacher.myStudents.findIndex(
      (o: DbUser) => o.creationId === student.creationId
    );
    teacher.myStudents[studentIdxInTeacher] = student;

    quizResult.quizStatus = QuizStatus.DONE;
    await this.dbService.putItem<DbQuizResult>(quizResult);
    await this.userService.updateUsers([student, teacher]);

    return quizResult;
  }

  private async sync(
    quizResult: DbQuizResult,
    params: UpdateQuizParams
  ): Promise<DbQuizResult> {
    if (params.id === undefined || params.answerOfTester === undefined)
      throw new Error('bad parameter');
    quizResult.results.push({
      id: params.id,
      answerOfTester: params.answerOfTester,
    });
    await this.dbService.putItem<DbQuizResult>(quizResult);

    return quizResult;
  }

  private async start(
    student: DbKey & Student,
    teacher: DbKey & Teacher,
    quiz: DbQuiz
  ): Promise<DbQuizResult> {
    const idx = student.quizes.findIndex(
      (o: QuizInfo) => o.quizId === quiz.creationId
    );
    student.quizes[idx].quizStatus = QuizStatus.TESTING;
    const studentIdxInTeacher = teacher.myStudents.findIndex(
      (o: DbUser) => o.creationId === student.creationId
    );
    teacher.myStudents[studentIdxInTeacher] = student;

    const newQuizResult: DbQuizResult = {
      projectEntity: AltarfEntity.quizResult,
      creationId: generateId(),
      quizId: quiz.creationId,
      testerId: student.creationId,
      startTime: Date.now(),
      quizStatus: QuizStatus.TESTING,
      results: [],
    };

    await this.dbService.putItem<DbQuizResult>(newQuizResult);
    await this.userService.updateUsers([student, teacher]);

    return newQuizResult;
  }

  public async save(
    lineUserId: string,
    sheetId: string,
    params: SaveQuizParams
  ): Promise<QuizValidateResponse> {
    this.validator.validateSaveQuizParams(params);

    const dbUser = await this.userService.getUserByLineId(lineUserId);
    this.bindSpreadsheetId(dbUser);

    const googleSheetService =
      bindings.get<GoogleSheetService>(GoogleSheetService);
    const rows = (await googleSheetService.getRows(
      sheetId
    )) as SpreadsheetQuizRow[];

    const validateResult = this.validate(rows);
    if (validateResult.status === QuizValidateResponseStatus.NEED_MORE_WORK)
      return validateResult;

    const questions = rows.map(
      (v: SpreadsheetQuizRow, i: number): QuizRow => ({
        id: `${generateId()}${i}`,
        question: v.question,
        type: v.type,
        options: v.options,
        answer: v.answer,
        image: v.image,
        field: v.field,
      })
    );

    const creationId: string = generateId();
    const dbQuiz: DbQuiz = {
      projectEntity: AltarfEntity.quiz,
      creationId,
      owner: dbUser.creationId,
      label: params.label,
      time: params.time,
      questions,
    };

    await this.dbService.putItem<DbQuiz>(dbQuiz);

    return validateResult;
  }

  private validate(quizRows: QuizRow[]): QuizValidateResponse {
    const badQuestions: QuizValidate[] = [];
    quizRows.forEach((v: QuizRow, i: number) => {
      const line = i + 1;
      if (v.question === undefined || v.question === '')
        badQuestions.push({ line, reason: 'empty question' });

      if (v.type === undefined)
        badQuestions.push({ line, reason: 'empty type' });
      else if (!Object.values(QuestionType).includes(v.type))
        badQuestions.push({
          line,
          reason: 'type should be S(single) or M(multiple) or B(fill in blank)',
        });

      if (
        v.options === undefined ||
        (v.type !== QuestionType.FILL_IN_BLANK && v.options === '')
      )
        badQuestions.push({ line, reason: 'empty options' });
      else if (
        v.type !== QuestionType.FILL_IN_BLANK &&
        Number.isNaN(Number(v.options))
      )
        badQuestions.push({
          line,
          reason: 'options should be a number',
        });
      else if (v.type !== QuestionType.FILL_IN_BLANK && Number(v.options) < 1)
        badQuestions.push({
          line,
          reason: 'options should be a position number',
        });

      if (v.answer === undefined || v.answer === '')
        badQuestions.push({ line, reason: 'empty answer' });
      else {
        const ansElement: string[] = v.answer.split(',');
        ansElement.forEach((ans: string) => {
          if (Number.isNaN(Number(ans)))
            badQuestions.push({
              line,
              reason: 'answers should be number',
            });
          else if (Number(ans) < 1)
            badQuestions.push({
              line,
              reason: 'answers should be positive number',
            });
        });
        if (v.type === QuestionType.SINGLE && ansElement.length !== 1)
          badQuestions.push({
            line,
            reason: 'type S should have only 1 answer',
          });
      }

      if (v.field === undefined || v.field === '')
        badQuestions.push({ line, reason: 'empty field' });
    });

    return {
      status:
        badQuestions.length === 0
          ? QuizValidateResponseStatus.OK
          : QuizValidateResponseStatus.NEED_MORE_WORK,
      content: badQuestions,
    };
  }

  private bindSpreadsheetId(dbUser: DbUser): void {
    if (dbUser.role !== Role.TEACHER)
      throw new Error(`role of ${dbUser.lineUserId} is not teacher`);
    if (dbUser.spreadsheetId === undefined)
      throw new Error(
        `role of ${dbUser.lineUserId} does not configure spread sheet id`
      );

    if (bindings.isBound(spreadsheetBindingId) === false)
      bindings
        .bind<string>(spreadsheetBindingId)
        .toConstantValue(dbUser.spreadsheetId);
    else
      bindings
        .rebind<string>(spreadsheetBindingId)
        .toConstantValue(dbUser.spreadsheetId);
  }
}
