import { inject, injectable } from 'inversify';
import { Quiz } from 'src/model/altarf/Quiz';
import { DbTeacherStudentPair, Role } from 'src/model/altarf/User';
import { QuizService } from './QuizService';
import { AltarfUserService } from './users/AltarfUserService';

/**
 * Service class for me
 */
@injectable()
export class MeService {
  @inject(AltarfUserService)
  private readonly userService!: AltarfUserService;

  @inject(QuizService)
  private readonly quizService!: QuizService;

  public async getMe(lineUserId: string): Promise<any> {
    const user = await this.userService.getUserByLineId(lineUserId);

    if (user.role === Role.TEACHER) {
      const pair = await this.quizService.getPairByTeacherId(user.creationId);
      const students = await Promise.all(
        pair.map(
          async (
            v: DbTeacherStudentPair
          ): Promise<{
            studentId: string;
            name: string;
            quizes?: (Quiz & { label: string })[];
          }> => {
            const student = await this.userService.getUserById(v.studentId);

            let quizes: (Quiz & { label: string })[];
            if (v.quizes === undefined) quizes = [];
            else
              quizes = await Promise.all(
                v.quizes.map(
                  async (quiz: Quiz): Promise<Quiz & { label: string }> => {
                    const thisQuiz = await this.quizService.getQuiz(
                      quiz.quizId
                    );

                    return {
                      quizId: quiz.quizId,
                      status: quiz.status,
                      time: quiz.time,
                      label: thisQuiz.label,
                    };
                  }
                )
              );

            return {
              studentId: v.studentId,
              name: student.name,
              quizes,
            };
          }
        )
      );

      return {
        id: user.creationId,
        lineUserId: user.lineUserId,
        name: user.name,
        role: Role.TEACHER,
        students,
        classroom: user.classroom,
        spreadsheetId: user.spreadsheetId,
      };
    } else if (user.role === Role.STUDENT) {
      const pair = await this.quizService.getPairByStudentId(user.creationId);
      await Promise.all(
        pair.map(
          async (
            v: DbTeacherStudentPair
          ): Promise<{
            teacherId: string;
            name: string;
            quizes?: (Quiz & { label: string })[];
          }> => {
            const teacher = await this.userService.getUserById(v.teacherId);

            let quizes: (Quiz & { label: string })[];
            if (v.quizes === undefined) quizes = [];
            else
              quizes = await Promise.all(
                v.quizes.map(
                  async (quiz: Quiz): Promise<Quiz & { label: string }> => {
                    const thisQuiz = await this.quizService.getQuiz(
                      quiz.quizId
                    );

                    return {
                      quizId: quiz.quizId,
                      status: quiz.status,
                      time: quiz.time,
                      label: thisQuiz.label,
                    };
                  }
                )
              );

            return {
              teacherId: v.teacherId,
              name: teacher.name,
              quizes,
            };
          }
        )
      );

      // return {
      //   id: user.creationId,
      //   lineUserId: user.lineUserId,
      //   name: user.name,
      //   role: Role.STUDENT,
      //   teachers,
      // };
    } else throw new Error('unexpected role');
  }
}
