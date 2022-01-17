import { HttpError } from 'src/error/HttpError';
import { LambdaOutput } from 'src/model/Lambda';

export function successOutput<T>(res: T): LambdaOutput {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    },
    body: JSON.stringify(res),
  };
}

export function errorOutput(e: unknown): LambdaOutput {
  const error: HttpError = e as HttpError;

  return {
    statusCode: error.status,
    headers: {
      'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    },
    body: JSON.stringify({
      status: error.status,
      name: error.name,
      message: error.message,
    }),
  };
}
