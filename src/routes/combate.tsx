import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  Shield,
  Sword,
  Swords,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useCombat, type CombatantKind, type Enemy } from "@/contexts/CombatContext";
import { toast } from "sonner";

export const Route = createFileRoute("/combate")({
  head: () => ({
    meta: [
      { title: "Combate — Pantalla DM" },
      {
        name: "description",
        content: "Gestiona enemigos, puntos de vida y orden de iniciativa en tiempo real.",
      },
    ],
  }),
  component: CombatPage,
});

function CombatPage() {
  return (
    <div className="px-6 py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-gold flex items-center gap-2">
          <Swords className="h-7 w-7" /> Combate
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea enemigos con sus estadísticas y gestiona el orden de iniciativa.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <EnemiesPanel />
        <InitiativePanel />
      </div>
    </div>
  );
}

/* ───────────────── Enemies ───────────────── */

function EnemiesPanel() {
  const { enemies, addEnemy, removeEnemy, adjustHp, setHp, updateEnemy, addCombatant } =
    useCombat();
  const [name, setName] = useState("");
  const [ac, setAc] = useState("12");
  const [speed, setSpeed] = useState("30");
  const [hp, setHpInput] = useState("10");

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Ponle un nombre al enemigo");
      return;
    }
    addEnemy({
      name,
      ac: Number(ac) || 10,
      speed: Number(speed) || 30,
      maxHp: Number(hp) || 1,
    });
    setName("");
    setHpInput("10");
    toast.success("Enemigo creado");
  };

  return (
    <section className="rounded-xl border border-border bg-card/60">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-display text-sm uppercase tracking-widest text-gold flex items-center gap-2">
          <Sword className="h-4 w-4" /> Enemigos ({enemies.length})
        </h2>
      </div>

      <form
        onSubmit={onCreate}
        className="grid gap-2 border-b border-border p-3 sm:grid-cols-[1.5fr_70px_70px_70px_auto]"
      >
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Nombre
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 60))}
            placeholder="Goblin, Dragón…"
            required
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">CA</Label>
          <Input
            type="number"
            value={ac}
            onChange={(e) => setAc(e.target.value)}
            min={0}
            max={99}
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Vel.</Label>
          <Input
            type="number"
            value={speed}
            onChange={(e) => setSpeed(e.target.value)}
            min={0}
            max={999}
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">PV</Label>
          <Input
            type="number"
            value={hp}
            onChange={(e) => setHpInput(e.target.value)}
            min={1}
            max={9999}
          />
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            className="w-full bg-gradient-gold text-gold-foreground hover:opacity-90"
          >
            <Plus className="mr-1 h-4 w-4" /> Crear
          </Button>
        </div>
      </form>

      {enemies.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          <Sword className="mx-auto mb-2 h-8 w-8" />
          Aún no hay enemigos. Crea el primero arriba.
        </div>
      ) : (
        <ScrollArea className="h-[55vh]">
          <ul className="divide-y divide-border">
            {enemies.map((en) => (
              <EnemyRow
                key={en.id}
                enemy={en}
                onRemove={() => removeEnemy(en.id)}
                onAdjust={(d) => adjustHp(en.id, d)}
                onSetHp={(v) => setHp(en.id, v)}
                onUpdate={(p) => updateEnemy(en.id, p)}
                onAddToInitiative={(initiative) => {
                  addCombatant({
                    name: en.name,
                    initiative,
                    kind: "enemy",
                    enemyId: en.id,
                  });
                  toast.success(`${en.name} añadido a la iniciativa`);
                }}
              />
            ))}
          </ul>
        </ScrollArea>
      )}
    </section>
  );
}

function EnemyRow({
  enemy,
  onRemove,
  onAdjust,
  onSetHp,
  onUpdate,
  onAddToInitiative,
}: {
  enemy: Enemy;
  onRemove: () => void;
  onAdjust: (delta: number) => void;
  onSetHp: (v: number) => void;
  onUpdate: (patch: Partial<Omit<Enemy, "id">>) => void;
  onAddToInitiative: (init: number) => void;
}) {
  const [damage, setDamage] = useState("");
  const [initiative, setInitiative] = useState("");
  const pct = enemy.maxHp > 0 ? (enemy.currentHp / enemy.maxHp) * 100 : 0;

  const apply = (sign: 1 | -1) => {
    const n = Number(damage);
    if (!Number.isFinite(n) || n === 0) return;
    onAdjust(sign * Math.abs(n));
    setDamage("");
  };

  return (
    <li className={`p-3 ${enemy.currentHp === 0 ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3">
        <Input
          value={enemy.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="h-8 max-w-[180px] font-display text-base text-foreground"
          aria-label="Nombre"
        />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" /> CA
          <Input
            type="number"
            value={enemy.ac}
            onChange={(e) => onUpdate({ ac: Number(e.target.value) })}
            className="h-7 w-14"
          />
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5" /> Vel
          <Input
            type="number"
            value={enemy.speed}
            onChange={(e) => onUpdate({ speed: Number(e.target.value) })}
            className="h-7 w-16"
          />
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Eliminar enemigo">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Heart className="h-4 w-4 text-destructive" />
        <Input
          type="number"
          value={enemy.currentHp}
          onChange={(e) => onSetHp(Number(e.target.value))}
          className="h-8 w-20 text-center font-display"
          aria-label="PV actuales"
        />
        <span className="text-xs text-muted-foreground">/</span>
        <Input
          type="number"
          value={enemy.maxHp}
          onChange={(e) => onUpdate({ maxHp: Number(e.target.value) })}
          className="h-8 w-20 text-center"
          aria-label="PV máximos"
        />
        <Progress value={pct} className="h-2 flex-1" />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          type="number"
          value={damage}
          onChange={(e) => setDamage(e.target.value)}
          placeholder="±"
          className="h-8 w-20"
          aria-label="Cantidad de daño / curación"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => apply(-1)}
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <Minus className="mr-1 h-3.5 w-3.5" /> Daño
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => apply(1)}
          className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Curar
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <Input
            type="number"
            value={initiative}
            onChange={(e) => setInitiative(e.target.value)}
            placeholder="Init"
            className="h-8 w-20"
            aria-label="Iniciativa para añadir"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const n = Number(initiative);
              if (!Number.isFinite(n)) {
                toast.error("Iniciativa inválida");
                return;
              }
              onAddToInitiative(n);
              setInitiative("");
            }}
            title="Añadir a la iniciativa"
          >
            <Swords className="mr-1 h-3.5 w-3.5" /> A iniciativa
          </Button>
        </div>
      </div>
    </li>
  );
}

/* ───────────────── Initiative ───────────────── */

function InitiativePanel() {
  const {
    sortedCombatants,
    addCombatant,
    removeCombatant,
    updateCombatant,
    clearCombatants,
    activeIndex,
    setActiveIndex,
    nextTurn,
    prevTurn,
    round,
    resetRound,
  } = useCombat();

  const [name, setName] = useState("");
  const [init, setInit] = useState("");
  const [kind, setKind] = useState<CombatantKind>("player");

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nombre requerido");
      return;
    }
    const n = Number(init);
    if (!Number.isFinite(n)) {
      toast.error("Iniciativa inválida");
      return;
    }
    addCombatant({ name, initiative: n, kind });
    setName("");
    setInit("");
    toast.success(`${name} añadido`);
  };

  const activeId = sortedCombatants[activeIndex]?.id;

  return (
    <section className="rounded-xl border border-border bg-card/60">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-display text-sm uppercase tracking-widest text-gold flex items-center gap-2">
          <Users className="h-4 w-4" /> Orden de combate
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Ronda</span>
          <span className="rounded-md bg-gold/15 px-2 py-0.5 font-display text-gold">{round}</span>
        </div>
      </div>

      <form
        onSubmit={onAdd}
        className="grid gap-2 border-b border-border p-3 sm:grid-cols-[1.4fr_90px_140px_auto]"
      >
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Nombre
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 60))}
            placeholder="Jugador / Aliado / Enemigo"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Iniciativa
          </Label>
          <Input
            type="number"
            value={init}
            onChange={(e) => setInit(e.target.value)}
            placeholder="18"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tipo</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as CombatantKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="player">Jugador</SelectItem>
              <SelectItem value="ally">Aliado</SelectItem>
              <SelectItem value="enemy">Enemigo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            className="w-full bg-gradient-gold text-gold-foreground hover:opacity-90"
          >
            <Plus className="mr-1 h-4 w-4" /> Añadir
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <Button size="sm" variant="outline" onClick={prevTurn} disabled={!sortedCombatants.length}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
        </Button>
        <Button
          size="sm"
          className="bg-gradient-gold text-gold-foreground hover:opacity-90"
          onClick={nextTurn}
          disabled={!sortedCombatants.length}
        >
          Siguiente turno <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={resetRound} disabled={!sortedCombatants.length}>
          <RotateCcw className="mr-1 h-4 w-4" /> Reiniciar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-destructive"
          onClick={() => {
            if (confirm("¿Vaciar el orden de combate?")) clearCombatants();
          }}
          disabled={!sortedCombatants.length}
        >
          <Trash2 className="mr-1 h-4 w-4" /> Vaciar
        </Button>
      </div>

      {sortedCombatants.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          <Users className="mx-auto mb-2 h-8 w-8" />
          Aún no hay combatientes. Añade jugadores, aliados o enemigos arriba.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead className="w-20">Init.</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-24">Tipo</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCombatants.map((c, i) => {
              const isActive = c.id === activeId;
              return (
                <TableRow
                  key={c.id}
                  className={isActive ? "bg-gold/10 hover:bg-gold/15" : ""}
                  onClick={() => setActiveIndex(i)}
                >
                  <TableCell className="font-display text-gold">{i + 1}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={c.initiative}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        updateCombatant(c.id, { initiative: Number(e.target.value) })
                      }
                      className="h-8 w-16 text-center font-display"
                      aria-label="Iniciativa"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={c.name}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateCombatant(c.id, { name: e.target.value })}
                      className="h-8"
                      aria-label="Nombre"
                    />
                  </TableCell>
                  <TableCell>
                    <KindBadge kind={c.kind} />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCombatant(c.id);
                      }}
                      aria-label="Quitar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

function KindBadge({ kind }: { kind: CombatantKind }) {
  const map = {
    player: { label: "Jugador", cls: "border-emerald-500/40 text-emerald-400" },
    ally: { label: "Aliado", cls: "border-sky-500/40 text-sky-400" },
    enemy: { label: "Enemigo", cls: "border-destructive/40 text-destructive" },
  } as const;
  const m = map[kind];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}
