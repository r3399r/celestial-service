import { bindings } from 'src/bindings';
import { MyStudentsEvent } from 'src/lambda/altarf/myStudents/MyStudentsEvent';
import { LambdaContext } from 'src/lambda/LambdaContext';
import { LineLoginService } from 'src/services/LineLoginService';
import { AltarfUserService } from 'src/services/users/AltarfUserService';
import {
  errorOutput,
  LambdaOutput,
  successOutput,
} from 'src/util/LambdaOutput';

export async function myStudents(
  event: MyStudentsEvent,
  _context?: LambdaContext
): Promise<LambdaOutput> {
  try {
    const altarfUserService: AltarfUserService = bindings.get<AltarfUserService>(
      AltarfUserService
    );
    const lineLoginService: LineLoginService = bindings.get<LineLoginService>(
      LineLoginService
    );

    const res: string = '';

    switch (event.httpMethod) {
      case 'POST':
        if (event.body === null) throw new Error('null body');
        if (event.headers['x-api-line'] === undefined)
          throw new Error('missing line authentication token');

        const lineUser = await lineLoginService.verifyAndGetUser(
          event.headers['x-api-line']
        );
        const body: { studentId: string[] } = JSON.parse(event.body);
        await altarfUserService.addStudents(lineUser.userId, body.studentId);
        break;
      default:
        throw new Error('unknown http method');
    }

    return successOutput(res);
  } catch (e) {
    return errorOutput(e);
  }
}
