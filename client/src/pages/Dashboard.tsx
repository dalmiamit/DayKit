import { useState, useRef, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useHabits, useToggleHabit, useCreateHabit } from "@/hooks/use-habits";
import { useCreateTodo, useUpdateTodo } from "@/hooks/use-todos";
import { CreateHabitDialog } from "@/components/habits/CreateHabitDialog";
import { format, getDay } from "date-fns";
import { Check, Flame, Clock, CalendarDays, Inbox, Plus, Calendar, Sun, Repeat, ArrowRight, CalendarPlus, X, Lightbulb, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Item, ItemCompletion } from "@shared/routes";
import { ConvertMenu } from "@/components/ConvertMenu";

type HabitWithCompletions = Item & { completions: ItemCompletion[] };
type CommitmentType = "scheduled" | "date-only" | "flexible" | "recurring";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function matchesRecurrenceRule(rule: string | null, date: Date): boolean {
  if (!rule) return true;
  const lower = rule.toLowerCase().trim();
  if (lower === "daily") return true;
  if (lower === "weekdays") {
    const day = getDay(date);
    return day >= 1 && day <= 5;
  }
  if (lower === "weekends") {
    const day = getDay(date);
    return day === 0 || day === 6;
  }
  const todayName = DAY_NAMES[getDay(date)];
  const ruleDays = lower.split(",").map(d => d.trim());
  return ruleDays.includes(todayName);
}

function getCommitmentType(item: Item): CommitmentType {
  if (item.scheduledTime) return "scheduled";
  if (item.type === "habit" || item.recurrenceRule) return "recurring";
  if (item.flexible) return "flexible";
  return "date-only";
}

const COMMITMENT_CONFIG: Record<CommitmentType, { label: string; icon: typeof Clock; description: string }> = {
  scheduled: { label: "Scheduled", icon: Clock, description: "Time-bound commitments" },
  "date-only": { label: "Date-only", icon: CalendarDays, description: "Due today, do anytime" },
  flexible: { label: "Flexible", icon: Shuffle, description: "Tackle when it feels right" },
  recurring: { label: "Recurring", icon: Repeat, description: "Daily rituals and habits" },
};

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

const URGENT_KEYWORDS = ["groceries", "buy", "pick up", "pickup", "grab", "errand", "pharmacy", "mail", "return", "drop off", "dropoff", "call", "book", "send"];

function isUrgentItem(title: string): boolean {
  const lower = title.toLowerCase();
  return URGENT_KEYWORDS.some(kw => lower.includes(kw));
}

function getDaysPending(createdAt: string | Date | null): number {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const startOfCreated = new Date(created.getFullYear(), created.getMonth(), created.getDate());
  const now = new Date();
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((startOfNow.getTime() - startOfCreated.getTime()) / (1000 * 60 * 60 * 24));
}

function filterBacklogByPriority(items: Item[]): Item[] {
  return items
    .filter(item => {
      const days = getDaysPending(item.createdAt);
      const threshold = isUrgentItem(item.title) ? 2 : 7;
      return days >= threshold;
    })
    .sort((a, b) => getDaysPending(b.createdAt) - getDaysPending(a.createdAt))
    .slice(0, 5);
}

function CommitmentGroup({ type, scheduledItems, habitItems, todayStr, onToggle, onToggleHabit }: {
  type: CommitmentType;
  scheduledItems: Item[];
  habitItems: HabitWithCompletions[];
  todayStr: string;
  onToggle: (id: number, completed: boolean) => void;
  onToggleHabit: (id: number) => void;
}) {
  const config = COMMITMENT_CONFIG[type];
  const Icon = config.icon;
  const totalCount = scheduledItems.length + habitItems.length;

  if (totalCount === 0) return null;

  return (
    <div data-testid={`group-${type}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{config.label}</h3>
        <span className="text-xs text-muted-foreground/50">{config.description}</span>
        <span className="text-xs text-muted-foreground/60 ml-auto">{totalCount}</span>
      </div>
      <div className="space-y-1">
        {habitItems.map((habit) => {
          const isCompleted = habit.completions.some(c => c.date === todayStr);
          return (
            <div
              key={`habit-${habit.id}`}
              className={cn(
                "flex items-center gap-3 rounded-md p-2.5 transition-colors",
                isCompleted ? "opacity-60" : "hover-elevate"
              )}
              data-testid={`commitment-item-${habit.id}`}
            >
              <button
                onClick={() => onToggleHabit(habit.id)}
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-200 shrink-0",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-transparent hover:border-primary/50"
                )}
                data-testid={`toggle-habit-${habit.id}`}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </button>
              <span className={cn(
                "text-sm font-medium transition-colors flex-1",
                isCompleted ? "text-muted-foreground line-through" : "text-foreground"
              )}>
                {habit.title}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="h-3 w-3" />
                {habit.recurrenceRule || "daily"}
              </span>
              {habit.scheduledTime && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {habit.scheduledTime}
                </span>
              )}
              <ConvertMenu itemId={habit.id} currentType="habit" />
            </div>
          );
        })}
        {scheduledItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-md p-2.5 transition-colors hover-elevate"
            data-testid={`commitment-item-${item.id}`}
          >
            <Checkbox
              checked={false}
              onCheckedChange={() => onToggle(item.id, true)}
              className="h-4.5 w-4.5 rounded-md border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              data-testid={`checkbox-item-${item.id}`}
            />
            <span className="text-sm font-medium text-foreground flex-1">{item.title}</span>
            {item.type === "event" && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                event
              </span>
            )}
            {item.scheduledTime && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {item.scheduledTime}
              </span>
            )}
            {item.flexible && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Sun className="h-3 w-3" />
                flexible
              </span>
            )}
            <ConvertMenu itemId={item.id} currentType={item.type} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FloatingBacklogSection({ items, onSchedule, onDismiss }: {
  items: Item[];
  onSchedule: (id: number) => void;
  onDismiss: (id: number) => void;
}) {
  const filtered = filterBacklogByPriority(items);
  if (filtered.length === 0) return null;

  return (
    <section data-testid="section-floating-backlog">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Floating Suggestions</h2>
        <span className="text-xs text-muted-foreground/60 ml-auto">up to 5</span>
      </div>
      <p className="text-xs text-muted-foreground/70 mb-3">
        These tasks have been sitting around. Want to tackle one today?
      </p>
      <div className="space-y-1.5">
        {filtered.map((item) => {
          const days = getDaysPending(item.createdAt);
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-md p-2.5 transition-colors hover-elevate"
              data-testid={`floating-item-${item.id}`}
            >
              <Inbox className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-foreground">{item.title}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0" data-testid={`badge-stale-${item.id}`}>
                    Stale
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground/70" data-testid={`text-pending-days-${item.id}`}>
                  Pending for {days} {days === 1 ? "day" : "days"}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSchedule(item.id)}
                  className="text-xs gap-1"
                  data-testid={`button-schedule-${item.id}`}
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Schedule
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDismiss(item.id)}
                  data-testid={`button-dismiss-${item.id}`}
                >
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

type SuggestionType = "habit" | "event" | null;

const HABIT_KEYWORDS = ["every", "daily", "weekly", "each day", "each week", "each morning", "each night", "routine", "recurring"];
const EVENT_PATTERNS = [
  /\b\d{1,2}\/\d{1,2}\b/,
  /\b\d{1,2}:\d{2}\b/,
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}\b/i,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b(tomorrow|tonight|this afternoon|this evening|this morning|next week)\b/i,
  /\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/i,
  /\b\d{1,2}\s*(am|pm)\b/i,
];

function detectSuggestion(text: string): SuggestionType {
  if (!text || text.length < 3) return null;
  const lower = text.toLowerCase();
  if (EVENT_PATTERNS.some(p => p.test(text))) return "event";
  if (HABIT_KEYWORDS.some(kw => lower.includes(kw))) return "habit";
  return null;
}

function InlineAddTodo() {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const { mutate: createTodo } = useCreateTodo();
  const { mutate: createHabit } = useCreateHabit();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const suggestion = useMemo(() => detectSuggestion(title), [title]);

  const handleCreate = () => {
    if (!title.trim()) return;
    createTodo({ title });
    setTitle("");
    setIsAdding(false);
  };

  const handleConvertToHabit = () => {
    if (!title.trim()) return;
    createHabit({ title: title.trim(), recurrenceRule: "daily" });
    setTitle("");
    setIsAdding(false);
  };

  const handleConvertToEvent = async () => {
    if (!title.trim()) return;
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), type: "event", scheduledDate: format(new Date(), "yyyy-MM-dd") }),
      credentials: "include",
    });
    if (res.ok) {
      const { queryClient } = await import("@/lib/queryClient");
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items/scheduled"] });
    }
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
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (!title.trim()) setIsAdding(false); }}
            placeholder="What needs to be done?"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            data-testid="input-quick-add-todo"
          />
        </div>
        {suggestion === "habit" && (
          <div
            className="flex items-center gap-2 ml-6 py-1.5 px-2.5 rounded-md bg-accent/10 border border-accent/20 text-xs"
            data-testid="suggestion-habit"
          >
            <Repeat className="h-3.5 w-3.5 text-accent-foreground/70 shrink-0" />
            <span className="text-muted-foreground flex-1">This looks like a recurring item.</span>
            <button
              onMouseDown={(e) => { e.preventDefault(); handleConvertToHabit(); }}
              className="text-primary font-medium flex items-center gap-1 hover:underline"
              data-testid="button-convert-to-habit"
            >
              Convert to Habit <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}
        {suggestion === "event" && (
          <div
            className="flex items-center gap-2 ml-6 py-1.5 px-2.5 rounded-md bg-accent/10 border border-accent/20 text-xs"
            data-testid="suggestion-event"
          >
            <Calendar className="h-3.5 w-3.5 text-accent-foreground/70 shrink-0" />
            <span className="text-muted-foreground flex-1">This looks like a scheduled event.</span>
            <button
              onMouseDown={(e) => { e.preventDefault(); handleConvertToEvent(); }}
              className="text-primary font-medium flex items-center gap-1 hover:underline"
              data-testid="button-convert-to-event"
            >
              Schedule for today <ArrowRight className="h-3 w-3" />
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
      <span>Add a task</span>
    </button>
  );
}

const COMMITMENT_ORDER: CommitmentType[] = ["scheduled", "recurring", "date-only", "flexible"];

export default function Dashboard() {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const { data: habits, isLoading: habitsLoading } = useHabits();
  const { data: scheduled, isLoading: scheduledLoading } = useScheduledToday(todayStr);
  const { data: backlog, isLoading: backlogLoading } = useBacklogTodos();
  const { mutate: toggleHabit } = useToggleHabit();
  const { mutate: updateTodo } = useUpdateTodo();

  const isLoading = habitsLoading || scheduledLoading || backlogLoading;

  const handleToggleTodo = (id: number, completed: boolean) => {
    updateTodo({ id, status: completed ? "completed" : "active" });
  };

  const handleToggleHabit = (id: number) => {
    toggleHabit({ id, date: today });
  };

  const handleScheduleToday = (id: number) => {
    updateTodo({ id, scheduledDate: todayStr });
  };

  const handleDismiss = (id: number) => {
    updateTodo({ id, status: "dismissed" });
  };

  const allHabits = (habits || []) as HabitWithCompletions[];
  const scheduledItems = scheduled || [];

  const grouped = useMemo(() => {
    const groups: Record<CommitmentType, { items: Item[]; habits: HabitWithCompletions[] }> = {
      scheduled: { items: [], habits: [] },
      "date-only": { items: [], habits: [] },
      flexible: { items: [], habits: [] },
      recurring: { items: [], habits: [] },
    };

    for (const item of scheduledItems) {
      const ct = getCommitmentType(item);
      groups[ct].items.push(item);
    }

    for (const habit of allHabits) {
      if (habit.status !== "active") continue;
      if (!matchesRecurrenceRule(habit.recurrenceRule, today)) continue;
      if (habit.scheduledTime) {
        groups.scheduled.habits.push(habit);
      } else {
        groups.recurring.habits.push(habit);
      }
    }

    groups.scheduled.items.sort((a, b) => (a.scheduledTime || "").localeCompare(b.scheduledTime || ""));

    return groups;
  }, [scheduledItems, allHabits, today]);

  const activeGroups = COMMITMENT_ORDER.filter(
    type => grouped[type].items.length > 0 || grouped[type].habits.length > 0
  );

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold font-display tracking-tight text-foreground">
            Today
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(today, "EEEE, MMMM d")}
          </p>
        </header>

        {isLoading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 w-full animate-pulse rounded-md bg-secondary/30" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {activeGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 py-3" data-testid="text-no-commitments">
                Nothing on your plate today. Enjoy the calm.
              </p>
            ) : (
              activeGroups.map((type, idx) => (
                <div key={type}>
                  {idx > 0 && <div className="border-t border-border/30 mb-6" />}
                  <CommitmentGroup
                    type={type}
                    scheduledItems={grouped[type].items}
                    habitItems={grouped[type].habits}
                    todayStr={todayStr}
                    onToggle={handleToggleTodo}
                    onToggleHabit={handleToggleHabit}
                  />
                </div>
              ))
            )}

            <div className="border-t border-border/30 pt-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <InlineAddTodo />
                <CreateHabitDialog />
              </div>
            </div>

            <FloatingBacklogSection
              items={backlog || []}
              onSchedule={handleScheduleToday}
              onDismiss={handleDismiss}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
