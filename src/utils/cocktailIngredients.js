import { getUnitById, formatUnit } from "../constants/measureUnits";
import { formatAmount, toMetric, toImperial } from "./units";

export function buildIngredientIndex(ingredients = []) {
  const ingMap = new Map((ingredients || []).map((i) => [String(i.id), i]));
  const byBase = new Map();
  for (const ing of ingredients || []) {
    const baseId = String(ing.baseIngredientId ?? ing.id);
    const arr = byBase.get(baseId);
    if (arr) arr.push(ing);
    else byBase.set(baseId, [ing]);
  }
  const findBrand = (baseId) =>
    (byBase.get(String(baseId)) || []).find(
      (i) => i.inBar && String(i.baseIngredientId) === String(baseId)
    );
  return { ingMap, findBrand, byBase };
}

export function getCocktailIngredientInfo(
  cocktail,
  { ingMap, findBrand, allowSubstitutes = false, ignoreGarnish = false } = {}
) {
  const required = (cocktail.ingredients || []).filter(
    (r) => !r.optional && !(ignoreGarnish && r.garnish)
  );
  const missingNames = [];
  const missingIds = [];
  const ingredientNames = [];
  let allAvail = required.length > 0;
  let branded = false;
  for (const r of required) {
    const ing = ingMap.get(String(r.ingredientId));
    const baseId = String(ing?.baseIngredientId ?? r.ingredientId);
    let used = null;
    if (ing?.inBar) {
      used = ing;
    } else {
      if (allowSubstitutes || r.allowBaseSubstitution) {
        const base = ingMap.get(baseId);
        if (base?.inBar) used = base;
      }
      const isBaseIngredient = ing?.baseIngredientId == null;
      if (
        !used &&
        (allowSubstitutes || r.allowBrandedSubstitutes || isBaseIngredient)
      ) {
        const brand = findBrand ? findBrand(baseId) : null;
        if (brand) used = brand;
      }
      if (!used && Array.isArray(r.substitutes)) {
        for (const s of r.substitutes) {
          const candidate = ingMap.get(String(s.id));
          if (candidate?.inBar) {
            used = candidate;
            break;
          }
        }
      }
    }
    if (used) {
      ingredientNames.push(used.name);
      if (used.baseIngredientId != null) branded = true;
    } else {
      if (ing?.baseIngredientId != null) branded = true;
      const missingName = ing?.name || r.name || "";
      if (missingName) missingNames.push(missingName);
      missingIds.push(baseId);
      allAvail = false;
    }
  }
  let ingredientLine = ingredientNames.join(", ");
  if (!allAvail) {
    if (missingNames.length > 0 && missingNames.length <= 2) {
      ingredientLine = `Missing: ${missingNames.join(", ")}`;
    } else if (missingNames.length >= 3 || missingNames.length === 0) {
      ingredientLine = `Missing: ${missingNames.length || required.length} ingredients`;
    }
  }
  return {
    ingredientLine,
    isAllAvailable: allAvail,
    hasBranded: branded,
    missingIngredientIds: missingIds,
  };
}

export function getCocktailIngredientRows(
  cocktail,
  {
    ingMap = new Map(),
    byBase = new Map(),
    allowSubstitutes = false,
    ignoreGarnish = false,
    showImperial = false,
  } = {},
) {
  const list = Array.isArray(cocktail.ingredients)
    ? [...cocktail.ingredients].sort((a, b) => a.order - b.order)
    : [];

  return list.map((r) => {
    const ing = r.ingredientId ? ingMap.get(String(r.ingredientId)) : null;
    const originalName = ing?.name || r.name;
    const inBar = ing?.inBar;
    let substitute = null;
    let declaredSubstitutes = [];
    let baseSubstitutes = [];
    let brandedSubstitutes = [];
    const baseId = String(ing?.baseIngredientId ?? ing?.id ?? r.ingredientId);

    if (ing) {
      if (Array.isArray(r.substitutes)) {
        declaredSubstitutes = r.substitutes.map((s) => {
          const candidate = ingMap.get(String(s.id));
          return candidate?.name || s.name;
        });
      }
      if (allowSubstitutes || r.allowBaseSubstitution) {
        const base = ingMap.get(baseId);
        if (base && base.id !== ing.id) baseSubstitutes.push(base.name);
      }
      if (r.allowBrandedSubstitutes) {
        const others = (byBase.get(baseId) || []).filter(
          (i) => i.id !== ing.id && String(i.baseIngredientId) === String(baseId)
        );
        brandedSubstitutes = others.map((i) => i.name);
      }
    }

    if (!inBar && ing) {
      if (allowSubstitutes || r.allowBaseSubstitution) {
        const base = ingMap.get(baseId);
        if (base?.inBar && base.id !== ing.id) substitute = base;
      }

      if (!substitute && r.allowBrandedSubstitutes) {
        const brand = (byBase.get(baseId) || []).find(
          (i) =>
            i.inBar &&
            i.id !== ing.id &&
            String(i.baseIngredientId) === String(baseId)
        );
        if (brand) substitute = brand;
      }

      if (!substitute && Array.isArray(r.substitutes)) {
        for (const s of r.substitutes) {
          const candidate = ingMap.get(String(s.id));
          if (candidate?.inBar) {
            substitute = candidate;
            break;
          }
        }
      }
    }

    if (substitute) {
      const subName = substitute.name;
      declaredSubstitutes = declaredSubstitutes.filter((s) => s !== subName);
      baseSubstitutes = baseSubstitutes.filter((s) => s !== subName);
      brandedSubstitutes = brandedSubstitutes.filter((s) => s !== subName);
    } else if (inBar) {
      declaredSubstitutes = [];
      baseSubstitutes = [];
      brandedSubstitutes = [];
    }

    const display = substitute || ing || {};
    const finalInBar = substitute ? substitute.inBar : inBar;
    const ignored = ignoreGarnish && r.garnish && !finalInBar;

    let amount = r.amount;
    let unitName = getUnitById(r.unitId)?.name || "";
    if (amount != null) {
      if (showImperial) {
        ({ amount, unit: unitName } = toImperial(amount, unitName));
      } else {
        ({ amount, unit: unitName } = toMetric(amount, unitName));
      }
      unitName = formatUnit(unitName, amount);
      amount = formatAmount(amount, showImperial);
    } else {
      unitName = formatUnit(unitName, amount);
    }

    return {
      key: `${r.order}-${r.ingredientId ?? "free"}`,
      ingredientId: display.id || null,
      name: display.name || r.name,
      photoUri: display.photoUri || null,
      amount,
      unitName,
      inBar: finalInBar,
      ignored,
      garnish: !!r.garnish,
      optional: !!r.optional,
      substituteFor: substitute ? originalName : null,
      isBranded: display.baseIngredientId != null,
      declaredSubstitutes,
      baseSubstitutes,
      brandedSubstitutes,
    };
  });
}
