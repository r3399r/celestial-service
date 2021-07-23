import { bindings } from 'src/bindings';
import { QuizEvent } from 'src/lambda/altarf/quiz/QuizEvent';
import { LambdaContext } from 'src/lambda/LambdaContext';
import {
  DbQuiz,
  QuizValidateResponse,
  SaveQuizParams,
} from 'src/model/altarf/Quiz';
import { LineLoginService } from 'src/services/LineLoginService';
import { QuizService } from 'src/services/QuizService';
import {
  errorOutput,
  LambdaOutput,
  successOutput,
} from 'src/util/LambdaOutput';

export async function quiz(
  event: QuizEvent,
  _context?: LambdaContext
): Promise<LambdaOutput> {
  try {
    const quizService: QuizService = bindings.get<QuizService>(QuizService);
    const lineLoginService: LineLoginService = bindings.get<LineLoginService>(
      LineLoginService
    );

    let res: QuizValidateResponse | DbQuiz;

    switch (event.httpMethod) {
      case 'GET':
        if (event.pathParameters === null)
          throw new Error('null path parameter');
        if (event.pathParameters.id === undefined)
          throw new Error('missing user id');

        res = await quizService.getQuiz(event.pathParameters.id);
        break;
      case 'POST':
        if (event.headers['x-api-line'] === undefined)
          throw new Error('missing line authentication token');
        if (event.pathParameters === null)
          throw new Error('null path parameter');
        if (event.pathParameters.id === undefined)
          throw new Error('missing user id');
        if (event.body === null) throw new Error('null body');

        const lineUser = await lineLoginService.verifyAndGetUser(
          event.headers['x-api-line']
        );
        const params: SaveQuizParams = JSON.parse(event.body);

        res = await quizService.save(
          lineUser.userId,
          event.pathParameters.id,
          params
        );
        break;
      default:
        throw new Error('unknown http method');
    }

    return successOutput(res);
  } catch (e) {
    return errorOutput(e);
  }
}
