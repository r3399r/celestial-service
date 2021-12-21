import {
  data2Record,
  entity,
  primaryAttribute,
  record2Data,
  relatedAttributeMany,
  relatedAttributeOne,
} from './DbHelper';

type User = {
  id: string;
  name: string;
};

type Class = {
  id: string;
  name: string;
  leader: User;
  viceLeader: User;
  member: User[];
  teacher: User[];
  time: string;
};

/**
 * test entity user
 */
@entity('user')
class UserEntity implements User {
  @primaryAttribute()
  public id: string;
  public name: string;

  constructor(input: User) {
    this.id = input.id;
    this.name = input.name;
  }
}

/**
 * test entity class
 */
@entity('class')
class ClassEntity implements Class {
  @primaryAttribute()
  public id: string;
  public name: string;
  @relatedAttributeOne()
  public leader: User;
  @relatedAttributeOne()
  public viceLeader: User;
  @relatedAttributeMany()
  public member: User[];
  @relatedAttributeMany()
  public teacher: User[];
  public time: string;

  constructor(input: Class) {
    this.id = input.id;
    this.name = input.name;
    this.leader = input.leader;
    this.viceLeader = input.viceLeader;
    this.member = input.member;
    this.teacher = input.teacher;
    this.time = input.time;
  }
}

/**
 * test entity class
 */
@entity('wrongclass')
class WrongClassEntity {
  @primaryAttribute()
  public id: string;
  @relatedAttributeMany()
  public member: User;

  constructor(input: any) {
    this.id = input.id;
    this.member = input.member;
  }
}

/**
 * Tests of db helper
 */
describe('DbHelper', () => {
  let dummyClassData: any;
  let dummyClassObj: any;
  let dummyClassRecord: any;
  let dummyLeader: any;
  let dummyViceLeader: any;
  let dummyClassmateA: any;
  let dummyClassmateB: any;
  let dummyTeacherA: any;
  let dummyTeacherB: any;
  const alias: string = 'test-alias';

  beforeAll(() => {
    dummyLeader = { id: '124', name: 'Wang' };
    dummyViceLeader = { id: '125', name: 'Chen' };
    dummyClassmateA = { id: '126', name: 'Chang' };
    dummyClassmateB = { id: '127', name: 'Lin' };
    dummyTeacherA = { id: '128', name: 'Lai' };
    dummyTeacherB = { id: '129', name: 'Liu' };
    dummyClassData = new ClassEntity({
      id: 'abc',
      name: 'test-name',
      leader: new UserEntity(dummyLeader),
      viceLeader: new UserEntity(dummyViceLeader),
      member: [
        new UserEntity(dummyClassmateA),
        new UserEntity(dummyClassmateB),
      ],
      teacher: [new UserEntity(dummyTeacherA), new UserEntity(dummyTeacherB)],
      time: 'test-time',
    });
    dummyClassObj = {
      id: 'abc',
      name: 'test-name',
      leader: dummyLeader,
      viceLeader: dummyViceLeader,
      member: [dummyClassmateA, dummyClassmateB],
      teacher: [dummyTeacherA, dummyTeacherB],
      time: 'test-time',
    };
    dummyClassRecord = [
      {
        pk: `${alias}#class#abc`,
        sk: `${alias}#class#abc`,
        attribute: undefined,
        id: 'abc',
        name: 'test-name',
        time: 'test-time',
      },
      {
        pk: `${alias}#class#abc`,
        sk: `${alias}#user#124`,
        attribute: 'leader#one',
        id: '124',
        name: 'Wang',
      },
      {
        pk: `${alias}#class#abc`,
        sk: `${alias}#user#125`,
        attribute: 'viceLeader#one',
        id: '125',
        name: 'Chen',
      },
      {
        pk: `${alias}#class#abc`,
        sk: `${alias}#user#126`,
        attribute: 'member#many',
        id: '126',
        name: 'Chang',
      },
      {
        pk: `${alias}#class#abc`,
        sk: `${alias}#user#127`,
        attribute: 'member#many',
        id: '127',
        name: 'Lin',
      },
      {
        pk: `${alias}#class#abc`,
        sk: `${alias}#user#128`,
        attribute: 'teacher#many',
        id: '128',
        name: 'Lai',
      },
      {
        pk: `${alias}#class#abc`,
        sk: `${alias}#user#129`,
        attribute: 'teacher#many',
        id: '129',
        name: 'Liu',
      },
    ];
  });

  it('data2Record should work', () => {
    expect(data2Record(new UserEntity(dummyLeader), alias)).toStrictEqual([
      {
        pk: `${alias}#user#124`,
        sk: `${alias}#user#124`,
        attribute: undefined,
        ...dummyLeader,
      },
    ]);
    expect(data2Record(dummyClassData, alias)).toStrictEqual(dummyClassRecord);
  });

  it('data2Record should fail', () => {
    expect(() =>
      data2Record(new WrongClassEntity({ id: 'a', member: 'b' }), alias)
    ).toThrowError('wrong format. member should be an array');
  });

  it('record2Data should work', () => {
    expect(record2Data(dummyClassRecord)).toStrictEqual(dummyClassObj);
  });
});
