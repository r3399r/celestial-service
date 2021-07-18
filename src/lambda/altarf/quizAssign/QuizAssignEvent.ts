export interface QuizAssignEvent {
  path: string;
  httpMethod: string;
  headers: {
    'x-api-line'?: string;
  };
  body: string | null;
}
