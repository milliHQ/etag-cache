import { TTLCache } from './ttl-cache';

type RequestHandler<Data> = (
  key: string,
  eTag?: string
) => Promise<{ item?: Data; eTag: string } | null>;

class ETagCache<Data> {
  /**
   * Instance of the data cache.
   */
  private ttlCache: TTLCache<Data>;
  /**
   * Contains the eTags for the data entries.
   */
  private eTags: Map<string, string>;

  private requestHandler: RequestHandler<Data>;
  /**
   * Handler that gets called when an item gets removed from the cache.
   *
   * @param key
   */
  private onDeleteItem = (key: string) => {
    this.eTags.delete(key);
  };

  /**
   * @param minTTL
   * @param requestHandler
   */
  constructor(minTTL: number, requestHandler: RequestHandler<Data>) {
    this.eTags = new Map();
    this.ttlCache = new TTLCache<Data>(minTTL, this.onDeleteItem);
    this.requestHandler = requestHandler;
  }

  private async requestNewItem(key: string): Promise<Data | null> {
    const item = await this.requestHandler(key);

    if (!item || !item.item) {
      return null;
    }

    this.eTags.set(key, item.eTag);
    this.ttlCache.set(key, item.item);
    return item.item;
  }

  private async revalidateExpiredItem(
    key: string,
    itemFromCache: Data
  ): Promise<Data | null> {
    const eTag = this.eTags.get(key);
    const item = await this.requestHandler(key, eTag);

    if (!item) {
      return null;
    }

    if (eTag === item.eTag) {
      // Only update the expiration when etag is unchanged
      this.ttlCache.updateTTL(key);
      return itemFromCache;
    } else if (item.item) {
      // Content of the item has changed, update item
      this.ttlCache.set(key, item.item);
      this.eTags.set(key, item.eTag);
      return item.item;
    }

    return null;
  }

  get(key: string): Promise<Data | null> {
    const cachedItem = this.ttlCache.get(key);

    if (cachedItem === null) {
      return this.requestNewItem(key);
    }

    if (cachedItem.expired) {
      return this.revalidateExpiredItem(key, cachedItem.item);
    }

    return Promise.resolve(cachedItem.item);
  }

  set(key: string, item: Data, eTag: string) {
    this.ttlCache.set(key, item);
    this.eTags.set(key, eTag);
  }
}

export { ETagCache };
