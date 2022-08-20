import { TTLCache } from '../lib/ttl-cache';

type MockedDate = jest.MockedFunction<typeof Date.now>;
Date.now = jest.fn();

describe('TTL cache', () => {
  test('Set and retrieve items from the cache ', () => {
    const cache = new TTLCache<string>(60);

    expect(cache.get('foo')).toBeNull();

    (Date.now as MockedDate).mockReturnValue(0);
    cache.set('foo', 'bar');

    (Date.now as MockedDate).mockReturnValue(60);
    expect(cache.get('foo')).toMatchObject({
      expired: false,
      item: 'bar',
    });

    (Date.now as MockedDate).mockReturnValue(61);
    expect(cache.get('foo')).toMatchObject({
      expired: true,
      item: 'bar',
    });
  });

  test('Purge cache', () => {
    const cache = new TTLCache<string>(60);

    (Date.now as MockedDate).mockReturnValue(0);
    cache.set('foo', 'bar');

    (Date.now as MockedDate).mockReturnValue(10);
    cache.set('hello', 'world');

    (Date.now as MockedDate).mockReturnValue(30);
    cache.set('nice', 'try');

    cache.purgeStale(71);

    expect(cache.get('foo')).toBeNull();
    expect(cache.get('hello')).toBeNull();
    expect(cache.get('nice')).not.toBeNull();
  });

  test('Purge cache on set', () => {
    const cache = new TTLCache<string>(60);

    (Date.now as MockedDate).mockReturnValue(0);
    cache.set('foo', 'bar');

    (Date.now as MockedDate).mockReturnValue(61);
    cache.set('hello', 'world');

    (Date.now as MockedDate).mockReturnValue(80);
    expect(cache.get('foo')).toBeNull();

    (Date.now as MockedDate).mockReturnValue(81);
    expect(cache.get('hello')).toMatchObject({
      expired: false,
      item: 'world',
    });

    (Date.now as MockedDate).mockReturnValue(122);
    expect(cache.get('hello')).toMatchObject({
      expired: true,
      item: 'world',
    });
  });

  test('Custom TTL', () => {
    const cache = new TTLCache<string>(60);

    (Date.now as MockedDate).mockReturnValue(0);
    cache.set('expire1', 'expire');
    cache.set('foo', 'bar', 80);
    cache.set('expire2', 'expire');

    (Date.now as MockedDate).mockReturnValue(61);
    cache.set('hello', 'world');
    expect(cache.get('foo')).toMatchObject({
      expired: false,
      item: 'bar',
    });
    expect(cache.get('expire1')).toBeNull();
    expect(cache.get('expire2')).toBeNull();

    (Date.now as MockedDate).mockReturnValue(81);
    expect(cache.get('foo')).toMatchObject({
      expired: true,
      item: 'bar',
    });
  });
});
