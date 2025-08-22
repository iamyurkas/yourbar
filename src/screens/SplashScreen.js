import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

import CocktailIcon from '../../assets/cocktail.svg';
import ShakerIcon from '../../assets/shaker.svg';
import IngredientIcon from '../../assets/lemon.svg';

const ICONS = [CocktailIcon, ShakerIcon, IngredientIcon];

export default function SplashScreen({ onFinish = () => {} }) {
  const spin1 = useRef(new Animated.Value(0)).current;
  const spin2 = useRef(new Animated.Value(0)).current;
  const spin3 = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const loops = useRef([]);
  const Icon1Ref = useRef(ICONS[0]);
  const Icon2Ref = useRef(ICONS[1]);
  const Icon3Ref = useRef(ICONS[2]);

  useEffect(() => {
    const values = [spin1, spin2, spin3];
    values.forEach((val, idx) => {
      val.setValue(0);
      const anim = Animated.loop(
        Animated.timing(val, {
          toValue: 1,
          duration: 120,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      anim.start();
      loops.current[idx] = anim;
    });

    const timeout = setTimeout(() => {
      loops.current.forEach((anim, idx) => {
        anim.stop();
        values[idx].stopAnimation(() => values[idx].setValue(0));
      });
      const RandomIcon = ICONS[Math.floor(Math.random() * ICONS.length)];
      Icon1Ref.current = RandomIcon;
      Icon2Ref.current = RandomIcon;
      Icon3Ref.current = RandomIcon;

      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(onFinish);
    }, 1800);

    return () => {
      clearTimeout(timeout);
      loops.current.forEach((anim) => anim && anim.stop());
    };
  }, [spin1, spin2, spin3, opacity, onFinish]);

  const rotations = [spin1, spin2, spin3].map((val) =>
    val.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  );

  const Icon1 = Icon1Ref.current;
  const Icon2 = Icon2Ref.current;
  const Icon3 = Icon3Ref.current;

  return (
    <Animated.View style={[styles.container, { opacity }] }>
      <View style={styles.iconRow}>
        <Animated.View style={{ transform: [{ rotate: rotations[0] }] }}>
          <Icon1 width={64} height={64} />
        </Animated.View>
        <Animated.View
          style={[styles.centerIcon, { transform: [{ rotate: rotations[1] }] }]}>
          <Icon2 width={64} height={64} />
        </Animated.View>
        <Animated.View style={{ transform: [{ rotate: rotations[2] }] }}>
          <Icon3 width={64} height={64} />
        </Animated.View>
      </View>
      <Text style={styles.title}>Your bar</Text>
      <Text style={styles.slogan}>Your rules</Text>
    </Animated.View>
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
