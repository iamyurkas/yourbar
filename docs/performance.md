# Performance Metrics

This project now logs simple performance metrics for each navigated screen.
Metrics include render duration and JavaScript heap usage. The data is
printed to the console, which can be inspected via Flipper's React Native
debugger.

## Potentially Slow Screens

Static analysis of screen file sizes highlights the following components as
likely performance hot spots:

- `src/screens/Cocktails/EditCocktailScreen.tsx` – 1596 lines
- `src/screens/Cocktails/AddCocktailScreen.tsx` – 1518 lines
- `src/screens/Ingredients/EditIngredientScreen.tsx` – 934 lines
- `src/screens/Ingredients/IngredientDetailsScreen.tsx` – 834 lines
- `src/screens/Ingredients/AddIngredientScreen.tsx` – 764 lines

Run the application with Flipper attached to gather live metrics and verify
these assumptions.

