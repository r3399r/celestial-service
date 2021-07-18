import { inject, injectable } from 'inversify';
import { bindings } from 'src/bindings';
import {
  AssignQuizParams,
  DbQuiz,
  QuestionType,
  Quiz,
  QuizRow,
  QuizStatus,
  QuizValidate,
  QuizValidateResponse,
  QuizValidateResponseStatus,
  SaveQuizParams,
  SpreadsheetQuizRow,
} from 'src/model/altarf/Quiz';
import { DbTeacherStudentPair, Role } from 'src/model/altarf/User';
import { AltarfEntity } from 'src/model/DbKey';
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

  public async getQuizByOwner(owner: string): Promise<DbQuiz[]> {
    return await this.dbService.query<DbQuiz>(AltarfEntity.quiz, [
      {
        key: 'owner',
        value: owner,
      },
    ]);
  }

  public async getPairByTeacherId(id: string): Promise<DbTeacherStudentPair[]> {
    return await this.dbService.query<DbTeacherStudentPair>(
      AltarfEntity.teacherStudentPair,
      [{ key: 'teacherId', value: id }]
    );
  }

  public async getPairByStudentId(id: string): Promise<DbTeacherStudentPair[]> {
    return await this.dbService.query<DbTeacherStudentPair>(
      AltarfEntity.teacherStudentPair,
      [{ key: 'studentId', value: id }]
    );
  }

  public async assign(
    lineUserId: string,
    params: AssignQuizParams
  ): Promise<void> {
    this.validator.validateAssignQuizParams(params);

    const teacher = await this.userService.getUserByLineId(lineUserId);
    if (teacher.role !== Role.TEACHER)
      throw new Error(`role of ${lineUserId} is not teacher`);

    await Promise.all(
      params.quizId.map(async (id: string) => {
        await this.getQuiz(id);
      })
    );

    const dbTeacherStudentPair = await Promise.all(
      params.studentId.map(async (id: string) => {
        const user = await this.userService.getUserById(id);
        if (user.role !== Role.STUDENT)
          throw new Error(`role of ${id} is not student`);

        const pair = await this.getPairByStudentId(id);

        if (pair.length === 0) throw new Error('pair does not exist');
        if (pair.length > 1) throw new Error('pair should be unique');

        if (pair[0].quizes !== undefined) {
          const sameQuiz = pair[0].quizes.filter((x: Quiz) =>
            params.quizId.includes(x.quizId)
          );
          if (sameQuiz.length > 0)
            throw new Error(
              `quiz ${sameQuiz[0].quizId} has already assigned to student ${id}`
            );
        }

        return pair[0];
      })
    );

    await Promise.all(
      dbTeacherStudentPair.map(async (pair: DbTeacherStudentPair) => {
        await Promise.all(
          params.quizId.map(async (id: string) => {
            const newQuiz: Quiz = {
              quizId: id,
              status: QuizStatus.TODO,
              time: params.time,
            };

            return await this.dbService.putItem<DbTeacherStudentPair>({
              ...pair,
              quizes:
                pair.quizes === undefined
                  ? [newQuiz]
                  : [...pair.quizes, newQuiz],
            });
          })
        );
      })
    );
  }

  public async save(
    lineUserId: string,
    sheetId: string,
    params: SaveQuizParams
  ): Promise<QuizValidateResponse> {
    this.validator.validateSaveQuizParams(params);

    const dbUser = await this.userService.getUserByLineId(lineUserId);
    this.bindSpreadsheetId(dbUser);

    const googleSheetService = bindings.get<GoogleSheetService>(
      GoogleSheetService
    );
    const rows = (await googleSheetService.getRows(
      sheetId
    )) as SpreadsheetQuizRow[];

    const validateResult = this.validate(rows);
    if (validateResult.status === QuizValidateResponseStatus.NEED_MORE_WORK)
      return validateResult;

    const questions = rows.map(
      (v: SpreadsheetQuizRow): QuizRow => {
        return {
          question: v.question,
          type: v.type,
          options: v.options,
          answer: v.answer,
          image: v.image,
          field: v.field,
        };
      }
    );

    const creationId: string = generateId();
    const dbQuiz: DbQuiz = {
      projectEntity: AltarfEntity.quiz,
      creationId,
      owner: dbUser.creationId,
      label: params.label,
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
