import * as SQLite from "expo-sqlite/legacy";

const db = SQLite.openDatabase("yourbar.db");

export function initDatabase() {
  db.transaction((tx) => {
    tx.executeSql(
      "CREATE TABLE IF NOT EXISTS cocktails (id INTEGER PRIMARY KEY NOT NULL, data TEXT);"
    );
    tx.executeSql(
      "CREATE TABLE IF NOT EXISTS ingredients (id TEXT PRIMARY KEY NOT NULL, data TEXT);"
    );
  });
}

export function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        sql,
        params,
        (_, result) => resolve(result),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
}

export default db;

