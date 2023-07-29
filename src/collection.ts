export type PeerId = string;
export type RemoteEntityId = string;

export type ComponentMessage = {
  type: string;
  value?: any;
};

export type EntityMessages = Record<RemoteEntityId, ComponentMessage[]>;

export class CollectionWithTwoKeys<T> {
  private collection: Map<PeerId, Map<RemoteEntityId, T>>;

  constructor() {
    this.collection = new Map();
  }

  set(key1: PeerId, key2: RemoteEntityId, value: T) {
    if (!this.collection.has(key1)) {
      this.collection.set(key1, new Map());
    }
    this.collection.get(key1)!.set(key2, value);
  }

  get(key1: PeerId, key2: RemoteEntityId): T | undefined {
    const subMap = this.collection.get(key1);
    return subMap ? subMap.get(key2) : undefined;
  }

  has(key1: PeerId, key2: RemoteEntityId): boolean {
    const subMap = this.collection.get(key1);
    return subMap ? subMap.has(key2) : false;
  }

  delete(key1: PeerId, key2: RemoteEntityId): boolean {
    const subMap = this.collection.get(key1);
    return subMap ? subMap.delete(key2) : false;
  }

  *iterator(): IterableIterator<[PeerId, RemoteEntityId, T]> {
    for (const [key1, subMap] of this.collection) {
      for (const [key2, value] of subMap) {
        yield [key1, key2, value];
      }
    }
  }

  findMissingItemsInMessage(key1: PeerId, message: EntityMessages): T[] {
    if (!this.collection.has(key1)) {
      return [];
    }

    const presentKeys: Set<string> = new Set();

    for (const [remoteId, _EUD] of Object.entries(message)) {
      presentKeys.add(remoteId);
    }

    const missingItems: T[] = [];
    for (const [key2, value] of this.collection.get(key1)!) {
      if (!presentKeys.has(key2)) {
        missingItems.push(value);
        this.collection.get(key1)!.delete(key2);
      }
    }

    return missingItems;
  }
}
