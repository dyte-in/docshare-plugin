import { useState, RefObject, useCallback, useRef } from "react";

const CanvasRef = (): [
  RefObject<HTMLCanvasElement>,
  boolean,
  (node: HTMLCanvasElement) => void
  ] => {
    const [state, updateState] = useState<boolean>(false);
    const ref = useRef<HTMLCanvasElement | null>(null);
    const setRef = useCallback((node: HTMLCanvasElement) => {
      if (!node) {
        updateState(false);
        return;
      }
      ref.current = node;
      updateState(true);
    }, []);
  
    return [ref, state, setRef];
  };

export default CanvasRef;