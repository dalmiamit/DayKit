import { AppLayout } from "@/components/layout/AppLayout";
import { HabitList } from "@/components/habits/HabitList";
import { CreateHabitDialog } from "@/components/habits/CreateHabitDialog";
import { useHabits, useUpdateHabit, useDeleteHabit } from "@/hooks/use-habits";
import { Button } from "@/components/ui/button";
import { Trash2, Archive, ArchiveRestore, Clock, Flame, TrendingUp } from "lucide-react";
import { ConvertMenu } from "@/components/ConvertMenu";
import { format, subDays, getDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { ItemCompletion } from "@shared/routes";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function matchesRecurrenceRule(rule: string | null, date: Date, createdDay?: number): boolean {
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
  if (lower === "weekly") {
    return getDay(date) === (createdDay ?? getDay(new Date()));
  }
  const todayName = DAY_NAMES[getDay(date)];
  const ruleDays = lower.split(",").map(d => d.trim());
  return ruleDays.includes(todayName);
}

function computeHabitStats(completions: ItemCompletion[], recurrenceRule: string | null, createdAt: string | Date | null) {
  const today = new Date();
  const completionDates = new Set(completions.map(c => c.date));
  const habitStartRaw = createdAt ? new Date(createdAt) : today;
  const habitStart = new Date(habitStartRaw.getFullYear(), habitStartRaw.getMonth(), habitStartRaw.getDate());
  const createdDay = getDay(habitStart);

  function rateOverDays(days: number): number {
    let eligible = 0;
    let completed = 0;
    for (let i = 0; i < days; i++) {
      const d = subDays(today, i);
      if (d < habitStart) break;
      if (matchesRecurrenceRule(recurrenceRule, d, createdDay)) {
        eligible++;
        if (completionDates.has(format(d, "yyyy-MM-dd"))) {
          completed++;
        }
      }
    }
    return eligible > 0 ? Math.round((completed / eligible) * 100) : 0;
  }

  let streak = 0;
  for (let i = 0; ; i++) {
    const d = subDays(today, i);
    if (d < habitStart) break;
    if (!matchesRecurrenceRule(recurrenceRule, d, createdDay)) continue;
    if (completionDates.has(format(d, "yyyy-MM-dd"))) {
      streak++;
    } else {
      break;
    }
  }

  return {
    rate7: rateOverDays(7),
    rate30: rateOverDays(30),
    streak,
  };
}

export default function HabitsPage() {
  const { data: habits } = useHabits();
  const { mutate: update } = useUpdateHabit();
  const { mutate: remove } = useDeleteHabit();

  const activeHabits = habits?.filter(h => h.status === "active") || [];
  const archivedHabits = habits?.filter(h => h.status === "archived") || [];

  return (
    <AppLayout>
      <header className="mb-8 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-primary" data-testid="text-habits-title">All Habits</h1>
          <p className="mt-1 text-muted-foreground">Manage your routines and consistency.</p>
        </div>
        <CreateHabitDialog />
      </header>

      <div className="space-y-12">
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Active</h2>
          {activeHabits.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {activeHabits.map(habit => {
                const stats = computeHabitStats(habit.completions, habit.recurrenceRule, habit.createdAt);
                return (
                  <div key={habit.id} className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-soft" data-testid={`card-habit-${habit.id}`}>
                    <div>
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg" data-testid={`text-habit-title-${habit.id}`}>{habit.title}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          {habit.scheduledTime && (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {habit.scheduledTime}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="capitalize">{habit.recurrenceRule || "daily"}</Badge>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Started {format(new Date(habit.createdAt || Date.now()), "MMM yyyy")}
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-secondary/40 p-3 text-center" data-testid={`stat-rate7-${habit.id}`}>
                          <div className="text-lg font-bold text-foreground">{stats.rate7}%</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Last 7 days</div>
                        </div>
                        <div className="rounded-xl bg-secondary/40 p-3 text-center" data-testid={`stat-rate30-${habit.id}`}>
                          <div className="text-lg font-bold text-foreground">{stats.rate30}%</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Last 30 days</div>
                        </div>
                        <div className="rounded-xl bg-secondary/40 p-3 text-center" data-testid={`stat-streak-${habit.id}`}>
                          <div className="text-lg font-bold text-foreground flex items-center justify-center gap-1">
                            <Flame className="h-4 w-4 text-primary" />
                            {stats.streak}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">Streak</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end gap-2 invisible group-hover:visible transition-opacity">
                      <ConvertMenu itemId={habit.id} currentType="habit" />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => update({ id: habit.id, status: "archived" })}
                        data-testid={`button-archive-habit-${habit.id}`}
                      >
                        <Archive className="mr-2 h-3 w-3" /> Archive
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => remove(habit.id)}
                        data-testid={`button-delete-habit-${habit.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground italic">No active habits.</p>
          )}
        </section>

        {archivedHabits.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Archived</h2>
            <div className="grid gap-4 md:grid-cols-2 opacity-60">
              {archivedHabits.map(habit => (
                <div key={habit.id} className="flex flex-col justify-between rounded-2xl border border-border bg-secondary/20 p-6" data-testid={`card-archived-habit-${habit.id}`}>
                  <div className="flex justify-between items-center gap-2 flex-wrap">
                    <h3 className="font-semibold line-through text-muted-foreground">{habit.title}</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => update({ id: habit.id, status: "active" })}
                      data-testid={`button-restore-habit-${habit.id}`}
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
