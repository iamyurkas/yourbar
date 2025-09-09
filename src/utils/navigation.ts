import { StackActions } from '@react-navigation/native';

const EDIT_SCREENS = new Set(['EditCocktail', 'EditIngredient']);

export function goBack(navigation) {
  try {
    const state = navigation.getState();
    let toPop = 1;
    for (let i = state.index - 1; i >= 0; i--) {
      const name = state.routes[i]?.name;
      if (EDIT_SCREENS.has(name)) {
        toPop += 1;
      } else {
        break;
      }
    }
    navigation.dispatch(StackActions.pop(toPop));
  } catch {
    navigation.goBack();
  }
}
