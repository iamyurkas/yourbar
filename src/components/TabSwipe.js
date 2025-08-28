import React from "react";
import {
  FlingGestureHandler,
  Directions,
  State,
} from "react-native-gesture-handler";

export default function TabSwipe({ navigation, children }) {
  const goNext = React.useCallback(() => {
    const state = navigation.getState();
    const index = state.index;
    if (index < state.routes.length - 1) {
      navigation.navigate(state.routes[index + 1].name);
    }
  }, [navigation]);

  const goPrev = React.useCallback(() => {
    const state = navigation.getState();
    const index = state.index;
    if (index > 0) {
      navigation.navigate(state.routes[index - 1].name);
    }
  }, [navigation]);

  return (
    <FlingGestureHandler
      direction={Directions.LEFT}
      onHandlerStateChange={({ nativeEvent }) => {
        if (nativeEvent.state === State.END) goNext();
      }}
    >
      <FlingGestureHandler
        direction={Directions.RIGHT}
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.END) goPrev();
        }}
      >
        {children}
      </FlingGestureHandler>
    </FlingGestureHandler>
  );
}

