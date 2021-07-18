/**
 * This module serves as an index of all functions exposed to AWS Lambda. It's
 * also possible to rename them on export here. This module should have no
 * business logic. It should contain only re-exports. For this reason, the
 * 'export-name' rule is disabled for this module.
 */
// tslint:disable: export-name
export { line } from 'src/lambda/line/line';
export { me } from 'src/lambda/altarf/me/me';
export { sign } from 'src/lambda/sign/sign';
export { ssm } from 'src/lambda/ssm/ssm';
export { starPair } from 'src/lambda/starPair/starPair';
export { stars } from 'src/lambda/stars/stars';
export { stock } from 'src/lambda/stock/stock';
export { trips } from 'src/lambda/trips/trips';
export { users } from 'src/lambda/users/users';
export { users as altarfUsers } from 'src/lambda/altarf/users/users';
export { myStudents } from 'src/lambda/altarf/myStudents/myStudents';
export { quiz } from 'src/lambda/altarf/quiz/quiz';
export { quizAssign } from 'src/lambda/altarf/quizAssign/quizAssign';
