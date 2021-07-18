import { Client } from '@line/bot-sdk';
import { DynamoDB } from 'aws-sdk';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { Container, interfaces } from 'inversify';
import 'reflect-metadata';
import { DbService } from 'src/services/DbService';
import { LineBotService } from 'src/services/LineBotService';
import { LineLoginService } from 'src/services/LineLoginService';
import { MeService } from 'src/services/MeService';
import { QuizService, spreadsheetBindingId } from 'src/services/QuizService';
import { SignService } from 'src/services/SignService';
import { SsmService } from 'src/services/SsmService';
import { StarService } from 'src/services/StarService';
import { StockService } from 'src/services/StockService';
import { TripService } from 'src/services/TripService';
import { AltarfUserService } from 'src/services/users/AltarfUserService';
import { SadalsuudUserService } from 'src/services/users/SadalsuudUserService';
import { UserService } from 'src/services/users/UserService';
import { Validator } from 'src/Validator';
import { GoogleSheetService } from './services/GoogleSheetService';

const container: Container = new Container();

container.bind<DbService>(DbService).toSelf();
container.bind<LineBotService>(LineBotService).toSelf();
container.bind<LineLoginService>(LineLoginService).toSelf();
container.bind<MeService>(MeService).toSelf();
container.bind<SignService>(SignService).toSelf();
container.bind<SsmService>(SsmService).toSelf();
container.bind<StarService>(StarService).toSelf();
container.bind<StockService>(StockService).toSelf();
container.bind<TripService>(TripService).toSelf();
container.bind<UserService>(UserService).toSelf();
container.bind<SadalsuudUserService>(SadalsuudUserService).toSelf();
container.bind<AltarfUserService>(AltarfUserService).toSelf();
container.bind<QuizService>(QuizService).toSelf();
container.bind<GoogleSheetService>(GoogleSheetService).toSelf();

container.bind<Client>(Client).toDynamicValue(
  (): Client =>
    new Client({
      channelAccessToken: String(process.env.CHANNEL_TOKEN),
      channelSecret: String(process.env.CHANNEL_SECRET),
    })
);
container
  .bind<GoogleSpreadsheet>(GoogleSpreadsheet)
  .toDynamicValue(
    (context: interfaces.Context) =>
      new GoogleSpreadsheet(context.container.get(spreadsheetBindingId))
  );

// validator
container.bind<Validator>(Validator).toSelf();

// AWS
container.bind<DynamoDB>(DynamoDB).toDynamicValue(() => new DynamoDB());

export { container as bindings };
