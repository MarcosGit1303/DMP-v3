import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { loadJSON, saveJSON } from "@/lib/dm-storage";
import { sanitizeName } from "@/lib/youtube";

export interface Enemy {
  id: string;
  name: string;
  ac: number; // Clase de Armadura
  speed: number; // Velocidad (pies / metros — texto numérico)
  maxHp: number;
  currentHp: number;
  notes?: string;
}

export type CombatantKind = "player" | "ally" | "enemy";

export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  kind: CombatantKind;
  /** Optional link to an Enemy entry to mirror HP. */
  enemyId?: string;
}

interface CombatContextValue {
  enemies: Enemy[];
  addEnemy: (input: Omit<Enemy, "id" | "currentHp"> & { currentHp?: number }) => string;
  updateEnemy: (id: string, patch: Partial<Omit<Enemy, "id">>) => void;
  adjustHp: (id: string, delta: number) => void;
  setHp: (id: string, value: number) => void;
  removeEnemy: (id: string) => void;

  combatants: Combatant[];
  addCombatant: (input: Omit<Combatant, "id">) => void;
  updateCombatant: (id: string, patch: Partial<Omit<Combatant, "id">>) => void;
  removeCombatant: (id: string) => void;
  clearCombatants: () => void;
  /** Sorted by initiative DESC. */
  sortedCombatants: Combatant[];
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  nextTurn: () => void;
  prevTurn: () => void;
  round: number;
  resetRound: () => void;
}

const CombatContext = createContext<CombatContextValue | null>(null);

const KEYS = {
  enemies: "dm.combat.enemies.v1",
  combatants: "dm.combat.combatants.v1",
  active: "dm.combat.active.v1",
  round: "dm.combat.round.v1",
};

function makeId() {
  return Math.random().toString(36).slice(2, 11);
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function CombatProvider({ children }: { children: React.ReactNode }) {
  const [enemies, setEnemies] = useState<Enemy[]>(() => loadJSON<Enemy[]>(KEYS.enemies, []));
  const [combatants, setCombatants] = useState<Combatant[]>(() =>
    loadJSON<Combatant[]>(KEYS.combatants, []),
  );
  const [activeIndex, setActiveIndex] = useState<number>(() => loadJSON<number>(KEYS.active, 0));
  const [round, setRound] = useState<number>(() => loadJSON<number>(KEYS.round, 1));

  useEffect(() => saveJSON(KEYS.enemies, enemies), [enemies]);
  useEffect(() => saveJSON(KEYS.combatants, combatants), [combatants]);
  useEffect(() => saveJSON(KEYS.active, activeIndex), [activeIndex]);
  useEffect(() => saveJSON(KEYS.round, round), [round]);

  const addEnemy = useCallback<CombatContextValue["addEnemy"]>((input) => {
    const id = makeId();
    const e: Enemy = {
      id,
      name: sanitizeName(input.name, 60) || "Enemigo",
      ac: clampInt(input.ac, 0, 99),
      speed: clampInt(input.speed, 0, 999),
      maxHp: clampInt(input.maxHp, 1, 9999),
      currentHp: clampInt(input.currentHp ?? input.maxHp, 0, 9999),
      notes: input.notes ? sanitizeName(input.notes, 200) : undefined,
    };
    setEnemies((prev) => [...prev, e]);
    return id;
  }, []);

  const updateEnemy = useCallback<CombatContextValue["updateEnemy"]>((id, patch) => {
    setEnemies((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const next = { ...e, ...patch } as Enemy;
        if (patch.name !== undefined) next.name = sanitizeName(String(patch.name), 60) || e.name;
        if (patch.ac !== undefined) next.ac = clampInt(Number(patch.ac), 0, 99);
        if (patch.speed !== undefined) next.speed = clampInt(Number(patch.speed), 0, 999);
        if (patch.maxHp !== undefined) {
          next.maxHp = clampInt(Number(patch.maxHp), 1, 9999);
          if (next.currentHp > next.maxHp) next.currentHp = next.maxHp;
        }
        if (patch.currentHp !== undefined) {
          next.currentHp = clampInt(Number(patch.currentHp), 0, next.maxHp);
        }
        return next;
      }),
    );
  }, []);

  const adjustHp = useCallback((id: string, delta: number) => {
    setEnemies((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, currentHp: clampInt(e.currentHp + delta, 0, e.maxHp) } : e,
      ),
    );
  }, []);

  const setHp = useCallback((id: string, value: number) => {
    setEnemies((prev) =>
      prev.map((e) => (e.id === id ? { ...e, currentHp: clampInt(value, 0, e.maxHp) } : e)),
    );
  }, []);

  const removeEnemy = useCallback((id: string) => {
    setEnemies((prev) => prev.filter((e) => e.id !== id));
    setCombatants((prev) => prev.filter((c) => c.enemyId !== id));
  }, []);

  const addCombatant = useCallback<CombatContextValue["addCombatant"]>((input) => {
    const c: Combatant = {
      id: makeId(),
      name: sanitizeName(input.name, 60) || "Sin nombre",
      initiative: clampInt(Number(input.initiative), -99, 999),
      kind: input.kind,
      enemyId: input.enemyId,
    };
    setCombatants((prev) => [...prev, c]);
  }, []);

  const updateCombatant = useCallback<CombatContextValue["updateCombatant"]>((id, patch) => {
    setCombatants((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const next = { ...c, ...patch } as Combatant;
        if (patch.name !== undefined) next.name = sanitizeName(String(patch.name), 60) || c.name;
        if (patch.initiative !== undefined)
          next.initiative = clampInt(Number(patch.initiative), -99, 999);
        return next;
      }),
    );
  }, []);

  const removeCombatant = useCallback((id: string) => {
    setCombatants((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearCombatants = useCallback(() => {
    setCombatants([]);
    setActiveIndex(0);
    setRound(1);
  }, []);

  const sortedCombatants = useMemo(() => {
    return [...combatants].sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      return a.name.localeCompare(b.name);
    });
  }, [combatants]);

  const nextTurn = useCallback(() => {
    setActiveIndex((i) => {
      if (sortedCombatants.length === 0) return 0;
      const next = i + 1;
      if (next >= sortedCombatants.length) {
        setRound((r) => r + 1);
        return 0;
      }
      return next;
    });
  }, [sortedCombatants.length]);

  const prevTurn = useCallback(() => {
    setActiveIndex((i) => {
      if (sortedCombatants.length === 0) return 0;
      if (i <= 0) {
        setRound((r) => Math.max(1, r - 1));
        return sortedCombatants.length - 1;
      }
      return i - 1;
    });
  }, [sortedCombatants.length]);

  const resetRound = useCallback(() => {
    setActiveIndex(0);
    setRound(1);
  }, []);

  const value: CombatContextValue = {
    enemies,
    addEnemy,
    updateEnemy,
    adjustHp,
    setHp,
    removeEnemy,
    combatants,
    addCombatant,
    updateCombatant,
    removeCombatant,
    clearCombatants,
    sortedCombatants,
    activeIndex,
    setActiveIndex,
    nextTurn,
    prevTurn,
    round,
    resetRound,
  };

  return <CombatContext.Provider value={value}>{children}</CombatContext.Provider>;
}

export function useCombat() {
  const ctx = useContext(CombatContext);
  if (!ctx) throw new Error("useCombat must be used within CombatProvider");
  return ctx;
}
