declare module "zustand/vanilla" {
  export type StateCreator<T> = (
    set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void,
    get: () => T
  ) => T;

  export type StoreApi<T> = {
    getState: () => T;
    setState: (
      partial: Partial<T> | ((state: T) => Partial<T>),
      replace?: boolean
    ) => void;
    subscribe: (listener: (state: T, prevState: T) => void) => () => void;
  };

  export function createStore<T>(initializer: StateCreator<T>): StoreApi<T>;
}

declare module "zustand" {
  import type { StoreApi, StateCreator } from "zustand/vanilla";

  export type { StoreApi, StateCreator };

  export function create<T>(initializer: StateCreator<T>): {
    <U>(selector: (state: T) => U): U;
    getState: StoreApi<T>["getState"];
    setState: StoreApi<T>["setState"];
    subscribe: StoreApi<T>["subscribe"];
  };

  export function create<T>(store: StoreApi<T>): {
    <U>(selector: (state: T) => U): U;
    getState: StoreApi<T>["getState"];
    setState: StoreApi<T>["setState"];
    subscribe: StoreApi<T>["subscribe"];
  };
}

