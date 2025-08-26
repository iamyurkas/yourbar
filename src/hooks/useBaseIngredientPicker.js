import { useState, useMemo, useDeferredValue } from "react";
import useDebounced from "./useDebounced";
import { normalizeSearch } from "../utils/normalizeSearch";
import { WORD_SPLIT_RE, wordPrefixMatch } from "../utils/wordPrefixMatch";

export default function useBaseIngredientPicker(baseIngredients, initialId = null) {
  const [baseIngredientId, setBaseIngredientId] = useState(initialId);
  const [baseIngredientSearch, setBaseIngredientSearch] = useState("");
  const debouncedQuery = useDebounced(baseIngredientSearch, 250);
  const deferredQuery = useDeferredValue(debouncedQuery);
  const filteredBase = useMemo(() => {
    const tokens = normalizeSearch(deferredQuery)
      .split(WORD_SPLIT_RE)
      .filter(Boolean);
    if (tokens.length === 0) return baseIngredients;
    return baseIngredients.filter((i) =>
      wordPrefixMatch(i.searchTokens || [], tokens)
    );
  }, [baseIngredients, deferredQuery]);
  const selectedBase = useMemo(
    () => baseIngredients.find((i) => i.id === baseIngredientId),
    [baseIngredients, baseIngredientId]
  );
  return {
    baseIngredientId,
    setBaseIngredientId,
    baseIngredientSearch,
    setBaseIngredientSearch,
    filteredBase,
    selectedBase,
  };
}

