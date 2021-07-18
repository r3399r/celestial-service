import { User as AltarfUser } from 'src/model/altarf/User';
import { DbKey } from 'src/model/DbKey';
import { User as SadalsuudUser } from 'src/model/sadalsuud/User';

export type User = SadalsuudUser | AltarfUser;
export type DbUser = User & DbKey;
