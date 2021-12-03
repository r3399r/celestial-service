export interface LambdaOutput {
  statusCode: number;
  headers: { [key: string]: string };
  body: string;
}

export interface LambdaContext {
  awsRequestId: string;
}
