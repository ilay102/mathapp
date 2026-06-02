import { createContext } from "react";

export const MathInputContext = createContext<((symbol: string) => void) | null>(null);
