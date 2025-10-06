import type Realm from "realm";
import type { ObjectSchema, Results, List, Object as RealmObject } from "realm";
import { normalizeSearch } from "../../utils/normalizeSearch";
import { WORD_SPLIT_RE } from "../../utils/wordPrefixMatch";
import { sortByName } from "../../utils/sortByName";
import type { IngredientRecord } from "../types";
import { initDatabase, query } from "../sqlite";

const now = () => Date.now();
const genId = () => now();

const IngredientSchema: ObjectSchema = {
  name: "Ingredient",
  primaryKey: "id",
  properties: {
    id: "int",
    name: "string",
    description: "string?",
    tags: { type: "list", objectType: "mixed" },
    baseIngredientId: "int?",
    usageCount: { type: "int", default: 0 },
    singleCocktailName: "string?",
    searchName: "string",
    searchTokens: { type: "list", objectType: "string" },
    photoUri: "string?",
    inBar: { type: "bool", default: false },
    inShoppingList: { type: "bool", default: false },
  },
};

type RealmModule = typeof import("realm");

type RealmInstance = Realm;

interface IngredientModel extends RealmObject {
  id: number;
  name: string;
  description: string | null;
  tags: List<unknown>;
  baseIngredientId: number | null;
  usageCount: number;
  singleCocktailName: string | null;
  searchName: string;
  searchTokens: List<string>;
  photoUri: string | null;
  inBar: boolean;
  inShoppingList: boolean;
}

let realmModulePromise: Promise<RealmModule> | null = null;
let realmInstancePromise: Promise<RealmInstance> | null = null;
let migrationPromise: Promise<void> | null = null;

async function loadRealmModule(): Promise<RealmModule> {
  if (!realmModulePromise) {
    realmModulePromise = import("realm");
  }
  return realmModulePromise;
}

function toRealmInput(item: IngredientRecord) {
  return {
    id: Number(item.id),
    name: item.name,
    description: item.description ?? null,
    tags: Array.isArray(item.tags) ? [...item.tags] : [],
    baseIngredientId: item.baseIngredientId ?? null,
    usageCount: Number(item.usageCount ?? 0),
    singleCocktailName: item.singleCocktailName ?? null,
    searchName: item.searchName,
    searchTokens: Array.isArray(item.searchTokens) ? [...item.searchTokens] : [],
    photoUri: item.photoUri ?? null,
    inBar: !!item.inBar,
    inShoppingList: !!item.inShoppingList,
  };
}

function sanitizeIngredient(i: Partial<IngredientRecord>): IngredientRecord {
  const id = Number(i?.id ?? genId());
  const name = String(i?.name ?? "").trim();
  const searchName = normalizeSearch(name);
  const searchTokens = searchName.split(WORD_SPLIT_RE).filter(Boolean);
  return {
    id,
    name,
    description: i?.description ?? null,
    tags: Array.isArray(i?.tags) ? i.tags : [],
    baseIngredientId: i?.baseIngredientId ?? null,
    usageCount: Number(i?.usageCount ?? 0),
    singleCocktailName: i?.singleCocktailName ?? null,
    searchName,
    searchTokens,
    photoUri: i?.photoUri ?? null,
    inBar: !!i?.inBar,
    inShoppingList: !!i?.inShoppingList,
  };
}

function toRecord(model: IngredientModel): IngredientRecord {
  return {
    id: Number(model.id),
    name: model.name,
    description: model.description ?? null,
    tags: Array.from(model.tags ?? []),
    baseIngredientId:
      model.baseIngredientId != null ? Number(model.baseIngredientId) : null,
    usageCount: Number(model.usageCount ?? 0),
    singleCocktailName: model.singleCocktailName ?? null,
    searchName: model.searchName,
    searchTokens: Array.from(model.searchTokens ?? []),
    photoUri: model.photoUri ?? null,
    inBar: !!model.inBar,
    inShoppingList: !!model.inShoppingList,
  };
}

function rowsToRecords(rows: any[]): IngredientRecord[] {
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    description: r.description ?? null,
    tags: r.tags ? JSON.parse(r.tags) : [],
    baseIngredientId: r.baseIngredientId != null ? Number(r.baseIngredientId) : null,
    usageCount: r.usageCount != null ? Number(r.usageCount) : 0,
    singleCocktailName: r.singleCocktailName ?? null,
    searchName: r.searchName ?? normalizeSearch(r.name ?? ""),
    searchTokens: r.searchTokens ? JSON.parse(r.searchTokens) : [],
    photoUri: r.photoUri ?? null,
    inBar: !!r.inBar,
    inShoppingList: !!r.inShoppingList,
  }));
}

async function migrateFromSqliteIfNeeded(realm: RealmInstance): Promise<void> {
  if (migrationPromise) {
    return migrationPromise;
  }
  migrationPromise = (async () => {
    const existingCount = realm.objects<IngredientModel>("Ingredient").length;
    if (existingCount > 0) {
      return;
    }
    await initDatabase();
    const res = await query(
      "SELECT id, name, description, tags, baseIngredientId, usageCount, singleCocktailName, searchName, searchTokens, photoUri, inBar, inShoppingList FROM ingredients",
      []
    );
    const rows = res?.rows?._array ?? [];
    if (!rows.length) {
      return;
    }
    const records = rowsToRecords(rows).map((record) => sanitizeIngredient(record));
    realm.write(() => {
      const existing = realm.objects<IngredientModel>("Ingredient");
      if (existing.length) {
        realm.delete(existing);
      }
      for (const item of records) {
        realm.create("Ingredient", toRealmInput(item), "modified");
      }
    });
  })();
  return migrationPromise;
}

async function getRealm(): Promise<RealmInstance> {
  if (!realmInstancePromise) {
    realmInstancePromise = (async () => {
      const realmModule = await loadRealmModule();
      const realm = await realmModule.default.open({
        schema: [IngredientSchema],
        schemaVersion: 1,
      });
      await migrateFromSqliteIfNeeded(realm);
      return realm;
    })();
  }
  return realmInstancePromise;
}

function toList(records: Results<IngredientModel>): IngredientRecord[] {
  return Array.from(records).map(toRecord);
}

export async function ensureRealm(): Promise<void> {
  await getRealm();
}

export async function getAllIngredients({
  limit,
  offset,
}: { limit?: number; offset?: number } = {}): Promise<IngredientRecord[]> {
  const realm = await getRealm();
  const collection = realm.objects<IngredientModel>("Ingredient").sorted("name");
  let records = toList(collection);
  if (typeof offset === "number" || typeof limit === "number") {
    const start = Math.max(0, offset ?? 0);
    const end = typeof limit === "number" ? start + limit : undefined;
    records = records.slice(start, end);
  }
  return records;
}

export async function getIngredientsByIds(ids: number[]): Promise<IngredientRecord[]> {
  const realm = await getRealm();
  const list = Array.isArray(ids) ? ids.filter((id) => id != null) : [];
  if (!list.length) return [];
  const collection = realm
    .objects<IngredientModel>("Ingredient")
    .filtered("id IN $0", list);
  return toList(collection).sort(sortByName);
}

export async function getIngredientsByBaseIds(
  baseIds: number[],
  { inBarOnly = false }: { inBarOnly?: boolean } = {}
): Promise<IngredientRecord[]> {
  const realm = await getRealm();
  const list = Array.isArray(baseIds) ? baseIds.filter((id) => id != null) : [];
  if (!list.length) return [];
  const queryParts = ["baseIngredientId IN $0"];
  if (inBarOnly) {
    queryParts.push("inBar == true");
  }
  const collection = realm
    .objects<IngredientModel>("Ingredient")
    .filtered(queryParts.join(" AND "), list);
  return toList(collection).sort(sortByName);
}

export async function saveAllIngredients(ingredients, _tx?): Promise<void> {
  const realm = await getRealm();
  const list = Array.isArray(ingredients) ? ingredients : [];
  const normalized = list.map((item) => sanitizeIngredient(item));
  realm.write(() => {
    const existing = realm.objects<IngredientModel>("Ingredient");
    if (existing.length) {
      realm.delete(existing);
    }
    for (const item of normalized) {
      realm.create("Ingredient", toRealmInput(item), "modified");
    }
  });
}

export async function addIngredient(ingredient): Promise<IngredientRecord> {
  const realm = await getRealm();
  const item = sanitizeIngredient({ ...ingredient, id: ingredient?.id ?? genId() });
  realm.write(() => {
    realm.create("Ingredient", toRealmInput(item), "modified");
  });
  return item;
}

export async function saveIngredient(updated): Promise<IngredientRecord | void> {
  if (!updated?.id) return;
  const realm = await getRealm();
  const name = String(updated.name ?? "").trim();
  const searchName = normalizeSearch(name);
  let item: IngredientRecord;
  if (
    updated.searchName === searchName &&
    Array.isArray(updated.searchTokens)
  ) {
    item = sanitizeIngredient({ ...updated, name });
    item.searchTokens = updated.searchTokens;
    item.searchName = updated.searchName;
  } else {
    item = sanitizeIngredient({ ...updated, name });
  }
  realm.write(() => {
    realm.create("Ingredient", toRealmInput(item), "modified");
  });
  return item;
}

export async function updateIngredientFields(id, fields): Promise<void> {
  if (!id || !fields || typeof fields !== "object") return;
  const realm = await getRealm();
  const existing = realm.objectForPrimaryKey<IngredientModel>("Ingredient", Number(id));
  if (!existing) return;
  const current = toRecord(existing);
  const item = sanitizeIngredient({ ...current, ...fields, id: Number(id) });
  realm.write(() => {
    realm.create("Ingredient", toRealmInput(item), "modified");
  });
}

export async function flushPendingIngredients(list): Promise<void> {
  const realm = await getRealm();
  const items = Array.isArray(list) ? list : [];
  if (!items.length) return;
  const normalized = items.map((item) => sanitizeIngredient(item));
  realm.write(() => {
    for (const item of normalized) {
      realm.create("Ingredient", toRealmInput(item), "modified");
    }
  });
}

export async function setIngredientsInShoppingList(ids, inShoppingList): Promise<void> {
  const realm = await getRealm();
  const list = Array.isArray(ids)
    ? Array.from(new Set(ids.filter((id) => id != null)))
    : [];
  if (!list.length) return;
  const collection = realm
    .objects<IngredientModel>("Ingredient")
    .filtered("id IN $0", list);
  realm.write(() => {
    for (const item of collection) {
      item.inShoppingList = !!inShoppingList;
    }
  });
}

export async function toggleIngredientsInBar(ids): Promise<void> {
  const realm = await getRealm();
  const list = Array.isArray(ids)
    ? Array.from(new Set(ids.filter((id) => id != null)))
    : [];
  if (!list.length) return;
  const collection = realm
    .objects<IngredientModel>("Ingredient")
    .filtered("id IN $0", list);
  realm.write(() => {
    for (const item of collection) {
      item.inBar = !item.inBar;
    }
  });
}

export async function deleteIngredient(id): Promise<void> {
  const realm = await getRealm();
  const item = realm.objectForPrimaryKey<IngredientModel>("Ingredient", Number(id));
  if (!item) return;
  realm.write(() => {
    realm.delete(item);
  });
}

export function getIngredientById(id, index) {
  return index ? index[id] : null;
}

export function removeIngredient(list, id) {
  return list.filter((item) => item.id !== id);
}

export function updateIngredientById(map, updated) {
  const prev = map.get(updated.id);
  if (!prev) return map;
  const next = new Map(map);
  next.set(updated.id, { ...prev, ...updated });
  return next;
}

export function buildIndex(list: IngredientRecord[]): Record<number, IngredientRecord> {
  return list.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as Record<number, IngredientRecord>);
}

export async function observeAllIngredients(
  callback: (records: IngredientRecord[]) => void
): Promise<() => void> {
  const realm = await getRealm();
  const collection = realm.objects<IngredientModel>("Ingredient").sorted("name");
  const emit = () => {
    callback(toList(collection));
  };
  const handler = () => emit();
  (collection as any).addListener(handler);
  emit();
  return () => {
    (collection as any).removeListener(handler);
  };
}

export async function observeIngredientById(
  id: number,
  callback: (record: IngredientRecord | null) => void
): Promise<() => void> {
  const realm = await getRealm();
  const collection = realm
    .objects<IngredientModel>("Ingredient")
    .filtered("id == $0", Number(id));
  const emit = () => {
    const record = collection.length ? toRecord(collection[0] as IngredientModel) : null;
    callback(record);
  };
  const handler = () => emit();
  (collection as any).addListener(handler);
  emit();
  return () => {
    (collection as any).removeListener(handler);
  };
}
