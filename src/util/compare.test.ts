import { compare } from './compare';

describe('sort', () => {
  it('sort should work', () => {
    expect([{ id: 3 }, { id: 1 }, { id: 2 }].sort(compare('id'))).toStrictEqual(
      [{ id: 1 }, { id: 2 }, { id: 3 }]
    );
    expect([{ id: 3 }, { id: 1 }, { id: 1 }].sort(compare('id'))).toStrictEqual(
      [{ id: 1 }, { id: 1 }, { id: 3 }]
    );
    expect(
      [{ id: 'id5' }, { id: 'id1' }, { id: 'id10' }].sort(compare('id'))
    ).toStrictEqual([{ id: 'id1' }, { id: 'id10' }, { id: 'id5' }]);
  });
});
