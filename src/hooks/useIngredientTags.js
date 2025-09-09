import { useState, useCallback, useEffect } from "react";
import { getAllTags } from "../data/ingredientTags";
import { BUILTIN_INGREDIENT_TAGS } from "../constants/ingredientTags";

export default function useIngredientTags() {
  const [availableTags, setAvailableTags] = useState([]);
  const [tagsModalVisible, setTagsModalVisible] = useState(false);
  const [tagsModalAutoAdd, setTagsModalAutoAdd] = useState(false);

  const loadAvailableTags = useCallback(async () => {
    const custom = await getAllTags();
    setAvailableTags([...BUILTIN_INGREDIENT_TAGS, ...(custom || [])]);
  }, []);

  // Load tag reference list on first use so screens using the hook
  // immediately have the up‑to‑date tag collection available.
  useEffect(() => {
    loadAvailableTags();
  }, [loadAvailableTags]);

  const closeTagsModal = useCallback(() => {
    setTagsModalVisible(false);
    setTagsModalAutoAdd(false);
    loadAvailableTags();
  }, [loadAvailableTags]);

  const openAddTagModal = useCallback(() => {
    setTagsModalAutoAdd(true);
    setTagsModalVisible(true);
  }, []);

  return {
    availableTags,
    setAvailableTags,
    tagsModalVisible,
    setTagsModalVisible,
    tagsModalAutoAdd,
    setTagsModalAutoAdd,
    loadAvailableTags,
    openAddTagModal,
    closeTagsModal,
  };
}

