'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  RollResult,
  RollOptions,
  parseFormula,
  rollDice,
  loadHistory,
  saveHistory,
  loadSeededPreference,
  saveSeededPreference,
} from '@/lib/dice-roller';

interface DiceRollerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  roll: (formula: string, options?: RollOptions) => RollResult | null;
  history: RollResult[];
  clearHistory: () => void;
  seeded: boolean;
  setSeeded: (value: boolean) => void;
  lastResult: RollResult | null;
}

const DiceRollerContext = createContext<DiceRollerContextValue | undefined>(undefined);

export function DiceRollerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<RollResult[]>([]);
  const [seeded, setSeededState] = useState(false);
  const [lastResult, setLastResult] = useState<RollResult | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount (only on client side)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHistory(loadHistory());
      setSeededState(loadSeededPreference());
      setIsInitialized(true);
    }
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  const setSeeded = useCallback((value: boolean) => {
    setSeededState(value);
    saveSeededPreference(value);
  }, []);

  const roll = useCallback((formulaString: string, options: RollOptions = {}) => {
    const parsed = parseFormula(formulaString);
    if (!parsed) {
      console.error('Invalid dice formula:', formulaString);
      return null;
    }

    // Use context seeded preference if not specified
    const rollOptions: RollOptions = {
      ...options,
      seeded: options.seeded !== undefined ? options.seeded : seeded,
      seed: options.seed || formulaString, // Use formula as seed if none provided
    };

    const result = rollDice(parsed, formulaString, rollOptions);
    setLastResult(result);

    // Add to history
    const newHistory = [result, ...history].slice(0, 10);
    setHistory(newHistory);
    saveHistory(newHistory);

    return result;
  }, [seeded, history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setLastResult(null);
    saveHistory([]);
  }, []);

  const value: DiceRollerContextValue = {
    isOpen,
    open,
    close,
    toggle,
    roll,
    history,
    clearHistory,
    seeded,
    setSeeded,
    lastResult,
  };

  return (
    <DiceRollerContext.Provider value={value}>
      {children}
    </DiceRollerContext.Provider>
  );
}

export function useDiceRoller() {
  const context = useContext(DiceRollerContext);
  if (!context) {
    throw new Error('useDiceRoller must be used within DiceRollerProvider');
  }
  return context;
}
