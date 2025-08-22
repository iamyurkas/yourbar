import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import CocktailIcon from '../../assets/cocktail.svg';
import ShakerIcon from '../../assets/shaker.svg';
import IngredientIcon from '../../assets/lemon.svg';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconRow}>
        <CocktailIcon width={64} height={64} />
        <ShakerIcon width={64} height={64} style={styles.centerIcon} />
        <IngredientIcon width={64} height={64} />
      </View>
      <Text style={styles.title}>Your bar</Text>
      <Text style={styles.slogan}>Your rules</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  iconRow: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'center',
  },
  centerIcon: {
    marginHorizontal: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  slogan: {
    fontSize: 16,
    color: '#555',
  },
});
