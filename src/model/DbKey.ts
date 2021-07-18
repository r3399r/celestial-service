export type Entity = SadalsuudEntity | AltarfEntity;

export enum SadalsuudEntity {
  trip = 'sadalsuud-trip',
  sign = 'sadalsuud-sign',
  target = 'sadalsuud-target',
  user = 'sadalsuud-user',
  star = 'sadalsuud-star',
  starPair = 'sadalsuud-starPair',
}

export enum AltarfEntity {
  user = 'altarf-user',
  quiz = 'altarf-quiz',
}

export interface DbKey {
  projectEntity: Entity;
  creationId: string;
}
