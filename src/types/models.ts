export interface IngredientTag {
  id: number;
  name: string;
  color: string;
}

export interface Ingredient {
  id: number;
  name: string;
  inBar: boolean;
  inShoppingList: boolean;
  baseIngredientId: number | null;
  photoUri: string | null;
  searchName: string;
}

export interface CocktailIngredient {
  ingredientId: number;
  optional?: boolean;
  allowBaseSubstitution?: boolean;
  allowBrandedSubstitutes?: boolean;
  substitutes?: { id: number }[];
  garnish?: boolean;
}

export interface Cocktail {
  id: number;
  ingredients: CocktailIngredient[];
}

export interface TagListItem {
  type: "TAG";
  tag: IngredientTag;
}

export interface IngredientListItem {
  type: "ING";
  ingredient: Ingredient;
  isLast: boolean;
}

export type ShakerListItem = TagListItem | IngredientListItem;
