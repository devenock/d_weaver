import { useState, useRef, useCallback } from "react";
import { Canvas as FabricCanvas } from "fabric";

export function useWhiteboardHistory(fabricCanvas: FabricCanvas | null) {
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(0);
  const historyStepRef = useRef(0);
  const isUndoRedoRef = useRef(false);

  const saveState = useCallback(() => {
    if (!fabricCanvas || isUndoRedoRef.current) return;

    const json = JSON.stringify(fabricCanvas.toJSON());
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyStepRef.current + 1);
      newHistory.push(json);
      historyStepRef.current = newHistory.length - 1;
      return newHistory;
    });
    setHistoryStep(historyStepRef.current);
  }, [fabricCanvas]);

  const initializeHistory = useCallback(() => {
    if (!fabricCanvas) return;
    const initialState = JSON.stringify(fabricCanvas.toJSON());
    setHistory([initialState]);
    setHistoryStep(0);
    historyStepRef.current = 0;
  }, [fabricCanvas]);

  const undo = useCallback(async () => {
    if (!fabricCanvas || historyStep === 0) return;

    isUndoRedoRef.current = true;
    const newStep = historyStep - 1;
    const prevState = history[newStep];

    if (prevState) {
      await fabricCanvas.loadFromJSON(JSON.parse(prevState));
      fabricCanvas.renderAll();
      setHistoryStep(newStep);
      historyStepRef.current = newStep;
    }
    isUndoRedoRef.current = false;
  }, [fabricCanvas, historyStep, history]);

  const redo = useCallback(async () => {
    if (!fabricCanvas || historyStep >= history.length - 1) return;

    isUndoRedoRef.current = true;
    const newStep = historyStep + 1;
    const nextState = history[newStep];

    if (nextState) {
      await fabricCanvas.loadFromJSON(JSON.parse(nextState));
      fabricCanvas.renderAll();
      setHistoryStep(newStep);
      historyStepRef.current = newStep;
    }
    isUndoRedoRef.current = false;
  }, [fabricCanvas, historyStep, history]);

  const jumpToStep = useCallback(
    async (step: number) => {
      if (!fabricCanvas || step < 0 || step >= history.length) return;

      isUndoRedoRef.current = true;
      const state = history[step];

      if (state) {
        await fabricCanvas.loadFromJSON(JSON.parse(state));
        fabricCanvas.renderAll();
        setHistoryStep(step);
        historyStepRef.current = step;
      }
      isUndoRedoRef.current = false;
    },
    [fabricCanvas, history],
  );

  return {
    history,
    historyStep,
    saveState,
    initializeHistory,
    undo,
    redo,
    jumpToStep,
    canUndo: historyStep > 0,
    canRedo: historyStep < history.length - 1,
  };
}
