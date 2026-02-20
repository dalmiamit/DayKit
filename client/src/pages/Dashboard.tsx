import { useState, useRef, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useHabits, useToggleHabit } from "@/hooks/use-habits";
import { useCreateTodo, useUpdateTodo } from "@/hooks/use-todos";
import { useRecurringEvents, useToggleRecurringEvent } from "@/hooks/use-recurring-events";
import { CreateItemDialog } from "@/components/CreateItemDialog";
import { format, getDay, startOfMonth } from "date-fns";
import {
  Check, Flame, Clock, CalendarDays, Inbox, Plus, Calendar,
  Repeat, ArrowRight, CalendarPlus, X, Lightbulb, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Item, ItemCompletion } from "@shared/routes";
import { ConvertMenu } from "@/components/ConvertMenu";

type ItemWithCompletions = Item & { completions: ItemCompletion[] };

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// ─── Recurrence matching ────────────────────────────────────────────────────

function matchesRecurrenceRule(rule: string | null | undefined, date: Date): boolean {
  if (!rule) return true;
  const lower = rule.toLowerCase().trim();

  if (lower === "daily") return true;
  if (lower === "weekly-flexible") return true; // always eligible, tracked separately

  if (lower === "weekdays") {
    const d = getDay(date);
    return d >= 1 && d <= 5;
  }
  if (lower === "weekends") {
    const d = getDay(date);
    return d === 0 || d === 6;
  }

  // monthly-[day] — show on the first occurrence of that weekday in the month
  if (lower.startsWith("monthly-")) {
    const dayName = lower.replace("monthly-", "");
    const targetDow = DAY_NAMES.indexOf(dayName);
    if (targetDow === -1) return false;
    if (getDay(date) !== targetDow) return false;
    // Check it's the first occurrence: date <= 7
    const firstOfMonth = startOfMonth(date);
    let cursor = new Date(firstOfMonth);
    while (cursor.getDay() !== targetDow) cursor.setDate(cursor.getDate() + 1);
    return date.getDate() === cursor.getDate();
  }

  const todayName = DAY_NAMES[getDay(date)];
  const ruleDays = lower.split(",").map(d => d.trim());
  return ruleDays.includes(todayName);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isCompletedToday(item: ItemWithCompletions, todayStr: string): boolean {
  return item.completions.some(c => c.date === todayStr);
}

/** Week-flexible habits: done if any completion exists this week (Mon–Sun window) */
function isCompletedThisWeek(item: ItemWithCompletions, date: Date): boolean {
  const day = date.getDay(); // 0=Sun
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return item.completions.some(c => {
    const d = new Date(c.date);
    return d >= monday && d <= sunday;
  });
}

// ─── Data hooks ─────────────────────────────────────────────────────────────

function useScheduledToday(date: string) {
  return useQuery({
    queryKey: ["/api/items/scheduled", date],
    queryFn: async () => {
      const res = await fetch(`/api/items/scheduled?date=${date}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch scheduled items");
      return res.json() as Promise<Item[]>;
    },
  });
}

function useBacklogTodos() {
  return useQuery({
    queryKey: ["/api/items/backlog"],
    queryFn: async () => {
      const res = await fetch("/api/items/backlog", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch backlog");
      return res.json() as Promise<Item[]>;
    },
  });
}

// ─── Backlog priority ───────────────────────────────────────────────────────

const URGENT_KEYWORDS = ["groceries","buy","pick up","pickup","grab","errand","pharmacy","mail","return","drop off","dropoff","call","book","send"];
function isUrgentItem(title: string) { return URGENT_KEYWORDS.some(kw => title.toLowerCase().includes(kw)); }
function getDaysPending(createdAt: string | Date | null): number {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  return Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime()) / 86400000);
}
function filterBacklogByPriority(items: Item[]): Item[] {
  return items
    .filter(item => getDaysPending(item.createdAt) >= (isUrgentItem(item.title) ? 2 : 7))
    .sort((a, b) => getDaysPending(b.createdAt) - getDaysPending(a.createdAt))
    .slice(0, 5);
}

// ─── Section: Scheduled (time-anchored) ────────────────────────────────────

function ScheduledSection({
  events,
  recurringEvents,
  habits,
  todayStr,
  today,
  onToggleHabit,
  onToggleRecurringEvent,
  onToggleTodo,
}: {
  events: Item[];
  recurringEvents: ItemWithCompletions[];
  habits: ItemWithCompletions[];
  todayStr: string;
  today: Date;
  onToggleHabit: (id: number) => void;
  onToggleRecurringEvent: (id: number) => void;
  onToggleTodo: (id: number, completed: boolean) => void;
}) {
  // Merge and sort all time-anchored items by scheduledTime
  const allItems = [
    ...events.map(e => ({ kind: "event" as const, item: e, completions: [] as ItemCompletion[] })),
    ...recurringEvents.map(e => ({ kind: "recurring_event" as const, item: e, completions: e.completions })),
    ...habits.map(h => ({ kind: "habit" as const, item: h, completions: h.completions })),
  ].sort((a, b) => (a.item.scheduledTime || "").localeCompare(b.item.scheduledTime || ""));

  if (allItems.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scheduled</h3>
        <span className="text-xs text-muted-foreground/50">Time-anchored commitments</span>
        <span className="text-xs text-muted-foreground/60 ml-auto">{allItems.length}</span>
      </div>
      <div className="space-y-1">
        {allItems.map(({ kind, item, completions }) => {
          const isCompleted = kind === "event"
            ? item.status === "completed"
            : completions.some(c => c.date === todayStr);
          return (
            <div
              key={`${kind}-${item.id}`}
              className={cn(
                "flex items-center gap-3 rounded-md p-2.5 transition-colors",
                isCompleted ? "opacity-50" : "hover-elevate"
              )}
            >
              {kind === "event" ? (
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={() => onToggleTodo(item.id, !isCompleted)}
                  className="h-4.5 w-4.5 rounded-md border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              ) : (
                <button
                  onClick={() => kind === "habit" ? onToggleHabit(item.id) : onToggleRecurringEvent(item.id)}
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-200 shrink-0",
                    isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 text-transparent hover:border-primary/50"
                  )}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </button>
              )}
              <span className={cn("text-sm font-medium flex-1 transition-colors", isCompleted ? "text-muted-foreground line-through" : "text-foreground")}>
                {item.title}
              </span>
              {item.scheduledTime && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.scheduledTime}
                </span>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {kind === "recurring_event" ? <RefreshCw className="h-3 w-3" /> : kind === "habit" ? <Flame className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                {kind === "recurring_event" ? "recurring" : kind === "habit" ? "habit" : "event"}
              </span>
              <ConvertMenu itemId={item.id} currentType={item.type} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section: Habits (no-time) ──────────────────────────────────────────────

function HabitsSection({
  dayHabits,
  flexibleHabits,
  todayStr,
  today,
  onToggle,
}: {
  dayHabits: ItemWithCompletions[];
  flexibleHabits: ItemWithCompletions[];
  todayStr: string;
  today: Date;
  onToggle: (id: number, itemType: string) => void;
}) {
  const total = dayHabits.length + flexibleHabits.length;
  if (total === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Habits</h3>
        <span className="text-xs text-muted-foreground/50">Building your routines</span>
        <span className="text-xs text-muted-foreground/60 ml-auto">{total}</span>
      </div>
      <div className="space-y-1">
        {dayHabits.map(habit => {
          const isCompleted = isCompletedToday(habit, todayStr);
          const label = habit.type === "recurring_event" ? (habit.recurrenceRule || "") : (habit.recurrenceRule || "daily");
          return (
            <HabitRow key={habit.id} habit={habit} isCompleted={isCompleted} onToggle={onToggle} label={label} />
          );
        })}
        {flexibleHabits.map(habit => {
          const isCompleted = isCompletedThisWeek(habit, today);
          return (
            <HabitRow key={habit.id} habit={habit} isCompleted={isCompleted} onToggle={onToggle} label="anytime this week" dim />
          );
        })}
      </div>
    </div>
  );
}

function HabitRow({ habit, isCompleted, onToggle, label, dim }: {
  habit: ItemWithCompletions;
  isCompleted: boolean;
  onToggle: (id: number, itemType: string) => void;
  label: string;
  dim?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md p-2.5 transition-colors",
        isCompleted ? "opacity-50" : "hover-elevate"
      )}
    >
      <button
        onClick={() => onToggle(habit.id, habit.type)}
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-200 shrink-0",
          isCompleted
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30 text-transparent hover:border-primary/50"
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </button>
      <span className={cn("text-sm font-medium flex-1 transition-colors", isCompleted ? "text-muted-foreground line-through" : "text-foreground")}>
        {habit.title}
      </span>
      <span className={cn("text-xs text-muted-foreground flex items-center gap-1", dim && "italic")}>
        {habit.type === "recurring_event" ? <RefreshCw className="h-3 w-3" /> : <Flame className="h-3 w-3" />}
        {label}
      </span>
      <ConvertMenu itemId={habit.id} currentType={habit.type} />
    </div>
  );
}

// ─── Section: Floating Backlog ──────────────────────────────────────────────

function FloatingBacklogSection({ items, onSchedule, onDismiss }: {
  items: Item[];
  onSchedule: (id: number) => void;
  onDismiss: (id: number) => void;
}) {
  const filtered = filterBacklogByPriority(items);
  if (filtered.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Floating Suggestions</h2>
        <span className="text-xs text-muted-foreground/60 ml-auto">up to 5</span>
      </div>
      <p className="text-xs text-muted-foreground/70 mb-3">These tasks have been sitting around. Want to tackle one today?</p>
      <div className="space-y-1.5">
        {filtered.map(item => {
          const days = getDaysPending(item.createdAt);
          return (
            <div key={item.id} className="flex items-center gap-3 rounded-md p-2.5 transition-colors hover-elevate">
              <Inbox className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-foreground">{item.title}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Stale</Badge>
                </div>
                <span className="text-xs text-muted-foreground/70">Pending for {days} {days === 1 ? "day" : "days"}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => onSchedule(item.id)} className="text-xs gap-1">
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Schedule
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDismiss(item.id)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Inline quick-add ───────────────────────────────────────────────────────

const HABIT_KEYWORDS = ["every","daily","weekly","each day","each week","each morning","each night","routine","recurring"];
const EVENT_PATTERNS = [
  /\b\d{1,2}\/\d{1,2}\b/,/\b\d{1,2}:\d{2}\b/,
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}\b/i,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b(tomorrow|tonight|this afternoon|this evening|this morning|next week)\b/i,
  /\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/i,/\b\d{1,2}\s*(am|pm)\b/i,
];
type SuggestionType = "habit" | "event" | null;
function detectSuggestion(text: string): SuggestionType {
  if (!text || text.length < 3) return null;
  if (EVENT_PATTERNS.some(p => p.test(text))) return "event";
  if (HABIT_KEYWORDS.some(kw => text.toLowerCase().includes(kw))) return "habit";
  return null;
}

function InlineAddTodo() {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const { mutate: createTodo } = useCreateTodo();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (isAdding && inputRef.current) inputRef.current.focus(); }, [isAdding]);

  const suggestion = useMemo(() => detectSuggestion(title), [title]);

  const handleCreate = () => {
    if (!title.trim()) return;
    createTodo({ title });
    setTitle("");
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
    else if (e.key === "Escape") { setTitle(""); setIsAdding(false); }
  };

  if (isAdding) {
    return (
      <div className="space-y-1.5 mt-2">
        <div className="flex items-center gap-2 py-2">
          <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (!title.trim()) setIsAdding(false); }}
            placeholder="What needs to be done?"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            data-testid="input-quick-add-todo"
          />
        </div>
        {suggestion === "habit" && (
          <div className="flex items-center gap-2 ml-6 py-1.5 px-2.5 rounded-md bg-accent/10 border border-accent/20 text-xs">
            <Repeat className="h-3.5 w-3.5 text-accent-foreground/70 shrink-0" />
            <span className="text-muted-foreground flex-1">Looks recurring — use the + button to create a habit.</span>
            <button onMouseDown={e => { e.preventDefault(); setIsAdding(false); }} className="text-primary font-medium flex items-center gap-1 hover:underline">
              Got it <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}
        {suggestion === "event" && (
          <div className="flex items-center gap-2 ml-6 py-1.5 px-2.5 rounded-md bg-accent/10 border border-accent/20 text-xs">
            <Calendar className="h-3.5 w-3.5 text-accent-foreground/70 shrink-0" />
            <span className="text-muted-foreground flex-1">Looks time-bound — use the + button to add an event.</span>
            <button onMouseDown={e => { e.preventDefault(); setIsAdding(false); }} className="text-primary font-medium flex items-center gap-1 hover:underline">
              Got it <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="flex items-center gap-2 py-2 mt-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      data-testid="button-quick-add-todo"
    >
      <Plus className="h-4 w-4" />
      <span>Add a to-do</span>
    </button>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export default function Dashboard() {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const { data: habits = [], isLoading: habitsLoading } = useHabits();
  const { data: recurringEvents = [], isLoading: recurringLoading } = useRecurringEvents();
  const { data: scheduled = [], isLoading: scheduledLoading } = useScheduledToday(todayStr);
  const { data: backlog = [], isLoading: backlogLoading } = useBacklogTodos();

  const { mutate: toggleHabit } = useToggleHabit();
  const { mutate: toggleRecurringEvent } = useToggleRecurringEvent();
  const { mutate: updateTodo } = useUpdateTodo();

  const isLoading = habitsLoading || recurringLoading || scheduledLoading || backlogLoading;

  // ── Categorise recurring events matching today ──
  const todayRecurringEvents = useMemo(() =>
    (recurringEvents as ItemWithCompletions[]).filter(e =>
      e.status === "active" && matchesRecurrenceRule(e.recurrenceRule, today)
    ),
    [recurringEvents, today]
  );

  // Recurring events with time → Scheduled section; without time → treat like habits
  const timedRecurringEvents = todayRecurringEvents.filter(e => !!e.scheduledTime);
  const untimedRecurringEvents = todayRecurringEvents.filter(e => !e.scheduledTime);

  // ── Categorise habits matching today ──
  const todayHabits = useMemo(() =>
    (habits as ItemWithCompletions[]).filter(h =>
      h.status === "active" && matchesRecurrenceRule(h.recurrenceRule, today)
    ),
    [habits, today]
  );

  const timedHabits = todayHabits.filter(h => !!h.scheduledTime);
  const dayHabits = todayHabits.filter(h => !h.scheduledTime && h.recurrenceRule !== "weekly-flexible");
  const flexibleHabits = todayHabits.filter(h => h.recurrenceRule === "weekly-flexible");

  // ── Categorise one-off scheduled events ──
  const timedEvents = scheduled.filter(i => !!i.scheduledTime && i.type === "event");
  const untimedEvents = scheduled.filter(i => !i.scheduledTime);

  // ── Combine: untimed recurring events show alongside day-specific habits ──
  const allDayHabits = [...dayHabits, ...(untimedRecurringEvents as ItemWithCompletions[])];

  const hasScheduled = timedEvents.length + timedRecurringEvents.length + timedHabits.length > 0;
  const hasHabits = allDayHabits.length + flexibleHabits.length > 0;
  const hasUntimedEvents = untimedEvents.length > 0;

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold font-display tracking-tight text-foreground">Today</h1>
          <p className="mt-1 text-sm text-muted-foreground">{format(today, "EEEE, MMMM d")}</p>
        </header>

        {isLoading ? (
          <div className="space-y-8">
            {[1,2,3].map(i => <div key={i} className="h-20 w-full animate-pulse rounded-md bg-secondary/30" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {!hasScheduled && !hasHabits && !hasUntimedEvents && (
              <p className="text-sm text-muted-foreground/60 py-3">Nothing on your plate today. Enjoy the calm.</p>
            )}

            {/* SCHEDULED — time-anchored */}
            {hasScheduled && (
              <ScheduledSection
                events={timedEvents}
                recurringEvents={timedRecurringEvents}
                habits={timedHabits}
                todayStr={todayStr}
                today={today}
                onToggleHabit={id => toggleHabit({ id, date: today })}
                onToggleRecurringEvent={id => toggleRecurringEvent({ id, date: today })}
                onToggleTodo={(id, completed) => updateTodo({ id, status: completed ? "completed" : "active" })}
              />
            )}

            {/* UNTIMED EVENTS (date-only one-off events) */}
            {hasUntimedEvents && (
              <div>
                {hasScheduled && <div className="border-t border-border/30 mb-6" />}
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Events Today</h3>
                  <span className="text-xs text-muted-foreground/50">No specific time</span>
                  <span className="text-xs text-muted-foreground/60 ml-auto">{untimedEvents.length}</span>
                </div>
                <div className="space-y-1">
                  {untimedEvents.map(item => (
                    <div key={item.id} className="flex items-center gap-3 rounded-md p-2.5 hover-elevate">
                      <Checkbox
                        checked={item.status === "completed"}
                        onCheckedChange={() => updateTodo({ id: item.id, status: item.status === "completed" ? "active" : "completed" })}
                        className="h-4.5 w-4.5 rounded-md border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className="text-sm font-medium text-foreground flex-1">{item.title}</span>
                      <ConvertMenu itemId={item.id} currentType={item.type} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HABITS — day-specific + week-flexible */}
            {hasHabits && (
              <div>
                {(hasScheduled || hasUntimedEvents) && <div className="border-t border-border/30 mb-6" />}
                <HabitsSection
                  dayHabits={allDayHabits}
                  flexibleHabits={flexibleHabits}
                  todayStr={todayStr}
                  today={today}
                  onToggle={(id, itemType) => {
                    if (itemType === "recurring_event") {
                      toggleRecurringEvent({ id, date: today });
                    } else {
                      toggleHabit({ id, date: today });
                    }
                  }}
                />
              </div>
            )}

            {/* QUICK-ADD + CREATE BUTTON */}
            <div className="border-t border-border/30 pt-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <InlineAddTodo />
                <CreateItemDialog />
              </div>
            </div>

            {/* FLOATING TO-DO BACKLOG */}
            <FloatingBacklogSection
              items={backlog}
              onSchedule={id => updateTodo({ id, scheduledDate: todayStr })}
              onDismiss={id => updateTodo({ id, status: "dismissed" })}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
