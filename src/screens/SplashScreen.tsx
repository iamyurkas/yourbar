import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import CocktailIcon from '../../assets/cocktail.svg';
import ShakerIcon from '../../assets/shaker.svg';
import IngredientIcon from '../../assets/lemon.svg';

const icons = [CocktailIcon, ShakerIcon, IngredientIcon];

function getRandomOtherIndex(current) {
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * icons.length);
  }
  return next;
}

export default function SplashScreen({ message }) {
  const [index1, setIndex1] = useState(0);
  const [index2, setIndex2] = useState(1);
  const [index3, setIndex3] = useState(2);

  useEffect(() => {
    const int1 = setInterval(() => {
      setIndex1(i => getRandomOtherIndex(i));
    }, 300);
    const int2 = setInterval(() => {
      setIndex2(i => getRandomOtherIndex(i));
    }, 400);
    const int3 = setInterval(() => {
      setIndex3(i => getRandomOtherIndex(i));
    }, 500);

    return () => {
      clearInterval(int1);
      clearInterval(int2);
      clearInterval(int3);
    };
  }, []);

  const Icon1 = icons[index1];
  const Icon2 = icons[index2];
  const Icon3 = icons[index3];

  return (
    <View style={styles.container}>
      <View style={styles.iconRow}>
        <Icon1 width={64} height={64} />
        <Icon2 width={64} height={64} style={styles.centerIcon} />
        <Icon3 width={64} height={64} />
      </View>
      <Text style={styles.title}>YourBar</Text>
      <Text style={styles.slogan}>Your rules</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
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
  message: {
    marginTop: 16,
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
