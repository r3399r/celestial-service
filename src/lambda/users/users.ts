import { bindings } from 'src/bindings';
import { LambdaContext } from 'src/lambda/LambdaContext';
import { User } from 'src/model/sadalsuud/User';
import { DbUser } from 'src/model/User';
import { SadalsuudUserService } from 'src/services/users/SadalsuudUserService';
import {
  errorOutput,
  LambdaOutput,
  successOutput,
} from 'src/util/LambdaOutput';
import { UsersEvent } from './UsersEvent';

export async function users(
  event: UsersEvent,
  _context?: LambdaContext
): Promise<LambdaOutput> {
  try {
    const userService: SadalsuudUserService = bindings.get<SadalsuudUserService>(
      SadalsuudUserService
    );

    let res: DbUser | null;

    switch (event.httpMethod) {
      case 'GET':
        if (event.pathParameters === null)
          throw new Error('null path parameter');
        if (event.pathParameters.id === undefined)
          throw new Error('missing user id');

        res = await userService.getWholeUserInfo(event.pathParameters.id);
        break;
      case 'POST':
        if (event.body === null) throw new Error('null body');

        const user: User = JSON.parse(event.body);
        res = await userService.addUser(user);
        break;
      default:
        throw new Error('unknown http method');
    }

    return successOutput(res);
  } catch (e) {
    return errorOutput(e);
  }
}
