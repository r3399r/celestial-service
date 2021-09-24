import { bindings } from 'src/bindings';
import { LambdaContext } from 'src/lambda/LambdaContext';
import { Invoice } from 'src/model/Demo';
import { DbService } from 'src/services/DbService2';
import {
  errorOutput,
  LambdaOutput,
  successOutput,
} from 'src/util/LambdaOutput';
import { v4 as uuidv4 } from 'uuid';

export async function demo(
  _event: any,
  _context?: LambdaContext
): Promise<LambdaOutput> {
  try {
    const service: DbService =
      bindings.get<DbService>(DbService);

    let res = '';

    const id = uuidv4()
    await service.putItem<Invoice>({
      pk: id,
      sk: id,
      dated: (new Date()).toString()
    })

    return successOutput(res);
  } catch (e) {
    return errorOutput(e);
  }
}
