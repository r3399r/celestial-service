import { bindings } from 'src/bindings';
import { QuizAssignEvent } from 'src/lambda/altarf/quizAssign/QuizAssignEvent';
import { LambdaContext } from 'src/lambda/LambdaContext';
import { AssignQuizParams } from 'src/model/altarf/Quiz';
import { LineLoginService } from 'src/services/LineLoginService';
import { QuizService } from 'src/services/QuizService';
import {
  errorOutput,
  LambdaOutput,
  successOutput,
} from 'src/util/LambdaOutput';

export async function quizAssign(
  event: QuizAssignEvent,
  _context?: LambdaContext
): Promise<LambdaOutput> {
  try {
    const quizService: QuizService = bindings.get<QuizService>(QuizService);
    const lineLoginService: LineLoginService =
      bindings.get<LineLoginService>(LineLoginService);

    const res: string = '';

    switch (event.httpMethod) {
      case 'POST':
        if (event.headers['x-api-line'] === undefined)
          throw new Error('missing line authentication token');
        if (event.body === null) throw new Error('null body');

        const lineUser = await lineLoginService.verifyAndGetUser(
          event.headers['x-api-line']
        );
        const params: AssignQuizParams = JSON.parse(event.body);

        await quizService.assign(lineUser.userId, params);
        break;
      default:
        throw new Error('unknown http method');
    }

    return successOutput(res);
  } catch (e) {
    return errorOutput(e);
  }
}
