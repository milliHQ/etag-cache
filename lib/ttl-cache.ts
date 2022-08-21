/**
 * A minimal time to live (TTL) cache with focus on performance.
 * Expired items are only purged from cache during set operation.
 * Get operation does not modify the cache, so that the get operation is
 * usually more performant than set.
 */
class TTLCache<T> {
  /**
   * The minimum time to live (TTL) for the objects in the data map.
   */
  private minTTL: number;
  /**
   * Holds the data
   */
  private data: Map<string, T>;
  /**
   * Holds the expiration times in ms.
   */
  private expirationMap: Map<string, number>;
  /**
   * List of all expirations
   */
  private expirations: Record<number, string[]>;
  /**
   * Callback that gets triggered when an item gets removed from the cache.
   */
  private onDeleteCallback: ((key: string) => void) | undefined;

  /**
   * @param ttl milliseconds until an entry is considered stale.
   * @param onDeleteCallback Optional callback that gets triggered when an item
   *  gets removed from the cache.
   */
  constructor(minTTL: number, onDeleteCallback?: (key: string) => void) {
    this.minTTL = minTTL;
    this.data = new Map();
    this.expirationMap = new Map();
    this.expirations = Object.create(null);
    this.onDeleteCallback = onDeleteCallback;
  }

  /**
   * Add an item to the cache.
   *
   * @param key
   * @param value
   * @param ttl
   */
  set(key: string, value: T, ttl: number = 0) {
    const minTTL = Math.max(this.minTTL, ttl);
    const time = Date.now();

    // Purge expired items from cache
    this.purgeStale(time);

    const expiration = Math.ceil(time + minTTL);

    // Set the data
    this.expirationMap.set(key, expiration);
    this.data.set(key, value);

    // Update the expiration table
    if (!this.expirations[expiration]) {
      this.expirations[expiration] = [key];
    } else {
      this.expirations[expiration].push(key);
    }
  }

  /**
   * Retrieve an item from the cache.
   *
   * @param key
   * @returns
   */
  get(key: string): {
    expired: boolean;
    item: T;
  } | null {
    const expiration = this.expirationMap.get(key);

    // When no expiration is present, the data is also not present, exit early
    if (expiration === undefined) {
      return null;
    }

    // Check if object is already expired
    const time = Date.now();
    const expired = time > expiration;

    return {
      expired,
      item: this.data.get(key)!,
    };
  }

  /**
   * Purges stale items from cache.
   *
   * @param time
   * @returns
   */
  purgeStale(time: number) {
    for (const exp in this.expirations) {
      // List goes from low -> high, so when the time exceeds we don't have
      // to check items that came after.
      if (Number(exp) > time) {
        return;
      }

      for (const key of this.expirations[exp]) {
        this.data.delete(key);
        this.expirationMap.delete(key);

        // Notify about removal from cache
        if (this.onDeleteCallback) {
          this.onDeleteCallback(key);
        }
      }
      delete this.expirations[exp];
    }
  }

  /**
   * Update the TTL of an existing item in the cache.
   *
   * @param key
   */
  updateTTL(key: string, ttl: number = 0) {
    const minTTL = Math.max(this.minTTL, ttl);
    const oldExpiration = this.expirationMap.get(key);

    if (oldExpiration) {
      const newExpiration = Math.ceil(Date.now() + minTTL);
      this.expirationMap.set(key, newExpiration);
      this.expirations[oldExpiration] = this.expirations[oldExpiration].filter(
        (item) => item !== key
      );
    }
  }
}

export { TTLCache };
