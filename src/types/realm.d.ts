declare module "realm" {
  export type PrimaryKey = string | number;

  export type UpdateMode = "never" | "modified" | "all";

  export interface ObjectSchemaProperty {
    type?: string;
    objectType?: string;
    optional?: boolean;
    default?: unknown;
  }

  export interface ObjectSchema {
    name: string;
    primaryKey?: string;
    embedded?: boolean;
    properties: {
      [propertyName: string]: string | ObjectSchemaProperty;
    };
  }

  export interface Configuration {
    schema: ObjectSchema[];
    schemaVersion?: number;
    inMemory?: boolean;
    onMigration?: (oldRealm: Realm, newRealm: Realm) => void;
  }

  export interface CollectionChangeSet {
    insertions: number[];
    deletions: number[];
    modifications: number[];
  }

  export interface ObjectChangeSet {
    deleted: boolean;
    changedProperties: string[];
  }

  export namespace Types {
    type Mixed = unknown;
  }

  export namespace Realm {
    type Mixed = Types.Mixed;
  }

  export class List<T = unknown> extends Array<T> {}

  export class Results<T = unknown> extends Array<T> {
    filtered(query: string, ...args: any[]): Results<T>;
    sorted(property: string, reverse?: boolean): Results<T>;
    addListener(
      callback: (collection: Results<T>, changes: CollectionChangeSet) => void
    ): void;
    removeListener(
      callback: (collection: Results<T>, changes: CollectionChangeSet) => void
    ): void;
    removeAllListeners(): void;
  }

  export class Object {
    addListener?(callback: (obj: Object, changes: ObjectChangeSet) => void): void;
    removeListener?(callback: (obj: Object, changes: ObjectChangeSet) => void): void;
    removeAllListeners?(): void;
    [key: string]: any;
  }

  export default class Realm {
    static open(config: Configuration): Promise<Realm>;
    constructor(config: Configuration);

    close(): void;
    write<T>(callback: () => T): T;
    objects<T>(name: string): Results<T & Object>;
    objectForPrimaryKey<T>(name: string, key: PrimaryKey): (T & Object) | undefined;
    create<T>(name: string, value: T, updateMode?: UpdateMode): T & Object;
    delete(target: Object | Object[] | List | Results): void;
  }
}
