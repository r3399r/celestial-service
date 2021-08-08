import { bindings } from 'src/bindings';
import { LambdaContext } from 'src/lambda/LambdaContext';
import { DbUser } from 'src/model/User';
import { LineLoginService } from 'src/services/LineLoginService';
import { MeService } from 'src/services/MeService';
import {
  errorOutput,
  LambdaOutput,
  successOutput,
} from 'src/util/LambdaOutput';
import { MeEvent } from './MeEvent';

export async function me(
  event: MeEvent,
  _context?: LambdaContext
): Promise<LambdaOutput> {
  try {
    const lineLoginService: LineLoginService =
      bindings.get<LineLoginService>(LineLoginService);
    const meService: MeService = bindings.get<MeService>(MeService);

    let res: DbUser;

    switch (event.httpMethod) {
      case 'GET':
        if (event.headers['x-api-line'] === undefined)
          throw new Error('missing authentication token');

        const lineUser = await lineLoginService.verifyAndGetUser(
          event.headers['x-api-line']
        );

        res = await meService.getMe(lineUser.userId);
        break;
      default:
        throw new Error('unknown http method');
    }

    return successOutput(res);
  } catch (e) {
    return errorOutput(e);
  }
}
