import { DbKey } from "./DbKey2";


export const PROJECT = 'demo'

export enum Entity {
  INVOICE = 'invoice',
  BILL = 'bill'
}

export type Invoice = DbKey & { dated: string }
export type Bill = DbKey & { dated: string }
export type InvoiceBillPair = DbKey