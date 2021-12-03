import { DynamoDB } from 'aws-sdk';
import { Container } from 'inversify';
import 'reflect-metadata';
import { DbService } from 'src/services/DbService';

const container: Container = new Container();

container.bind<DbService>(DbService).toSelf();

// AWS
container.bind<DynamoDB>(DynamoDB).toDynamicValue(() => new DynamoDB());

export { container as bindings };
