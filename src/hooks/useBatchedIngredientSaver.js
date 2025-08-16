import { useCallback, useEffect, useRef, useState } from "react";
import { getAllIngredients, saveAllIngredients } from "../storage/ingredientsStorage";

export default function useBatchedIngredientSaver(delay = 400) {
  const [pending, setPending] = useState([]);
  const timerRef = useRef(null);
  const pendingRef = useRef([]);

  const applyUpdates = useCallback(async (updates) => {
    if (updates.length === 0) return;
    const all = await getAllIngredients();
    const map = new Map(all.map((i) => [i.id, i]));
    updates.forEach((u) => {
      const existing = map.get(u.id);
      if (existing) map.set(u.id, { ...existing, ...u });
    });
    await saveAllIngredients(Array.from(map.values()));
  }, []);

  const flushPendingUpdates = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const updates = pendingRef.current;
    if (updates.length === 0) return;
    pendingRef.current = [];
    setPending([]);
    await applyUpdates(updates);
  }, [applyUpdates]);

  useEffect(() => {
    pendingRef.current = pending;
    if (pending.length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const updates = pendingRef.current;
      pendingRef.current = [];
      setPending([]);
      await applyUpdates(updates);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pending, delay, applyUpdates]);

  const queueIngredientUpdate = useCallback((update) => {
    setPending((prev) => [...prev, update]);
  }, []);

  useEffect(() => {
    return () => {
      flushPendingUpdates();
    };
  }, [flushPendingUpdates]);

  return { queueIngredientUpdate, flushPendingUpdates };
}
