export type LambdaOutput = {
  statusCode: number;
  headers: { [key: string]: string };
  body: string;
};

export type LambdaContext = {
  awsRequestId: string;
};

export type LambdaEvent = {
  resource: string;
  httpMethod: string;
  headers: {
    'x-api-token': string;
  };
  body: string | null;
  pathParameters: { [key: string]: string } | null;
  queryStringParameters: { [key: string]: string } | null;
};
