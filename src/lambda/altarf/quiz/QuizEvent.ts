export interface QuizEvent {
  httpMethod: string;
  pathParameters: {
    id?: string;
  } | null;
  headers: {
    'x-api-line'?: string;
  };
  body: string | null;
}
