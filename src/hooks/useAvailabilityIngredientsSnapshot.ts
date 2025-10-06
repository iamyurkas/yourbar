import { useEffect, useRef } from "react";

/**
 * Returns a cached reference to the most recent list of ingredients relevant
 * for availability calculations. The reference only updates when the provided
 * key changes, allowing callers to skip expensive recomputations triggered by
 * unrelated field edits (e.g. shopping list toggles).
 */
export default function useAvailabilityIngredientsSnapshot<T>(
  ingredients: T,
  availabilityKey: number
): T {
  const ref = useRef<T>(ingredients);
  const keyRef = useRef<number>(availabilityKey);

  useEffect(() => {
    if (keyRef.current !== availabilityKey) {
      ref.current = ingredients;
      keyRef.current = availabilityKey;
    }
  }, [ingredients, availabilityKey]);

  return ref.current;
}
