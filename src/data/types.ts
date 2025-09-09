export interface IngredientRecord {
  id: number;
  name: string;
  description: string | null;
  tags: unknown[];
  baseIngredientId: number | null;
  usageCount: number;
  singleCocktailName: string | null;
  searchName: string;
  searchTokens: string[];
  photoUri: string | null;
  inBar: boolean;
  inShoppingList: boolean;
}

export interface CocktailRecord {
  id: number;
  name: string;
  description: string | null;
  tags: unknown[];
  ingredients: any[];
  glassId: number | null;
  rating: number;
  instructions: string | null;
  createdAt: number | null;
  updatedAt: number | null;
  searchName: string;
  searchTokens: string[];
  photoUri: string | null;
  garnish?: string | null;
}
