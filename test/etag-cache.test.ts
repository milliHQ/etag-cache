import { ETagCache } from '../lib/etag-cache';

type MockedDate = jest.MockedFunction<typeof Date.now>;
Date.now = jest.fn();

describe('eTag cache', () => {
  test('Get item from empty cache', async () => {
    const mockedRequestHandler = jest.fn().mockImplementation(() => ({
      item: 'bar',
      eTag: '123',
    }));
    const etagCache = new ETagCache(60, mockedRequestHandler);

    const item = await etagCache.get('foo');
    expect(item).toBe('bar');
    expect(mockedRequestHandler).toBeCalledTimes(1);
    expect(mockedRequestHandler).toBeCalledWith('foo');
  });

  test('Cached item (not expired)', async () => {
    const mockedRequestHandler = jest.fn();
    const etagCache = new ETagCache<string>(60, mockedRequestHandler);

    (Date.now as MockedDate).mockReturnValue(0);
    etagCache.set('foo', 'bar', '123');

    // Cache not expired
    (Date.now as MockedDate).mockReturnValue(60);
    const item = await etagCache.get('foo');
    expect(item).toBe('bar');
    expect(mockedRequestHandler).not.toBeCalled();
  });

  test('Revalidate expired item (unchanged)', async () => {
    const mockedRequestHandler = jest.fn().mockImplementation(() => ({
      item: 'bar',
      eTag: '123',
    }));
    const etagCache = new ETagCache<string>(60, mockedRequestHandler);

    (Date.now as MockedDate).mockReturnValue(0);
    etagCache.set('foo', 'bar', '123');

    // Cache expired
    (Date.now as MockedDate).mockReturnValue(61);
    const item = await etagCache.get('foo');
    expect(item).toBe('bar');
    expect(mockedRequestHandler).toBeCalledTimes(1);
    expect(mockedRequestHandler).toBeCalledWith('foo', '123');
  });

  test('Revalidate expired item (changed)', async () => {
    const mockedRequestHandler = jest.fn().mockImplementation(() => ({
      item: 'bar2',
      eTag: '456',
    }));
    const etagCache = new ETagCache<string>(60, mockedRequestHandler);

    (Date.now as MockedDate).mockReturnValue(0);
    etagCache.set('foo', 'bar', '123');

    // Cache expired
    (Date.now as MockedDate).mockReturnValue(61);
    const item = await etagCache.get('foo');
    expect(item).toBe('bar2');
    expect(mockedRequestHandler).toBeCalledTimes(1);
    expect(mockedRequestHandler).toBeCalledWith('foo', '123');
  });
});
