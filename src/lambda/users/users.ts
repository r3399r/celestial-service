import { bindings } from 'src/bindings';
import { LambdaContext } from 'src/lambda/LambdaContext';
import { DbUser, User } from 'src/model/User';
import { UserService } from 'src/services/UserService';
import { LambdaOutput, successOutput } from 'src/util/LambdaOutput';
import { UsersEvent } from './UsersEvent';

export async function users(
  event: UsersEvent,
  _context?: LambdaContext
): Promise<LambdaOutput> {
  const userService: UserService = bindings.get<UserService>(UserService);

  let res: DbUser | null | void;

  switch (event.httpMethod) {
    case 'GET':
      if (event.pathParameters === null) {
        throw new Error('null path parameter');
      }
      if (event.queryStringParameters === null) {
        throw new Error('null query string parameters');
      }
      if (event.queryStringParameters.entity === undefined) {
        throw new Error('missing project entity');
      }
      if (event.pathParameters.id === undefined) {
        throw new Error('missing user id');
      }
      res = await userService.getUser(
        event.queryStringParameters.entity,
        event.pathParameters.id
      );
      break;
    case 'POST':
      if (event.queryStringParameters === null) {
        throw new Error('null query string parameters');
      }
      if (event.queryStringParameters.entity === undefined) {
        throw new Error('missing project entity');
      }
      if (event.body === null) {
        throw new Error('null body');
      }
      const user: User = JSON.parse(event.body);
      res = await userService.addUser(event.queryStringParameters.entity, user);
      break;
    default:
      throw new Error('unknown http method');
  }

  return successOutput(res);
}
