import { useState, useEffect } from "react";
import { Keyboard } from "react-native";

// Module-level state shared across all hook consumers
let currentHeight = 0;
const subscribers = new Set();

function notify(height) {
  currentHeight = height;
  subscribers.forEach((cb) => cb(height));
}

// Register keyboard listeners once at module load
Keyboard.addListener("keyboardDidShow", (e) => {
  notify(e?.endCoordinates?.height || 0);
});
Keyboard.addListener("keyboardDidHide", () => {
  notify(0);
});

export default function useKeyboardHeight() {
  const [height, setHeight] = useState(currentHeight);

  useEffect(() => {
    subscribers.add(setHeight);
    // Ensure subscriber gets latest known height immediately
    setHeight(currentHeight);
    return () => {
      subscribers.delete(setHeight);
    };
  }, []);

  return height;
}
