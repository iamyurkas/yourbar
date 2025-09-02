function toNumberId(value) {
  if (value == null) return null;
  const direct = Number(value);
  if (!Number.isNaN(direct)) return direct;
  const str = String(value);
  const parts = str.split('-');
  const last = parts[parts.length - 1];
  const num = Number(last);
  return Number.isNaN(num) ? null : num;
}

export function normalizeImportData(data, resolvePhoto) {
  const ingredientData = Array.isArray(data?.ingredients) ? data.ingredients : [];
  const ingredients = ingredientData.map(
    ({ inBar, inShoppingList, photoUri, ...rest }) => ({
      ...rest,
      id: toNumberId(rest?.id) ?? 0,
      baseIngredientId:
        rest?.baseIngredientId != null ? toNumberId(rest.baseIngredientId) : null,
      photoUri: resolvePhoto ? resolvePhoto(photoUri) : photoUri ?? null,
      inBar: false,
      inShoppingList: false,
    })
  );

  const cocktailData = Array.isArray(data?.cocktails) ? data.cocktails : [];
  const cocktails = cocktailData.map(
    ({ rating, photoUri, ...rest }) => ({
      ...rest,
      id: toNumberId(rest?.id) ?? 0,
      photoUri: resolvePhoto ? resolvePhoto(photoUri) : photoUri ?? null,
      ingredients: Array.isArray(rest?.ingredients)
        ? rest.ingredients.map((ing) => ({
            ...ing,
            ingredientId:
              ing?.ingredientId != null ? toNumberId(ing.ingredientId) : null,
            substitutes: Array.isArray(ing?.substitutes)
              ? ing.substitutes.map((s) => ({
                  ...s,
                  id: toNumberId(s?.id),
                }))
              : [],
            garnish: !!ing?.garnish,
            optional: !!ing?.optional,
            allowBaseSubstitution: !!(
              ing?.allowBaseSubstitution ?? ing?.allowBaseSubstitute
            ),
            allowBrandedSubstitutes: !!ing?.allowBrandedSubstitutes,
          }))
        : [],
    })
  );

  return { ingredients, cocktails };
}

