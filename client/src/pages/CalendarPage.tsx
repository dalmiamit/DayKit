import { AppLayout } from "@/components/layout/AppLayout";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { useHabits } from "@/hooks/use-habits";
import { format, getDay } from "date-fns";
import { motion } from "framer-motion";
import { Check, Clock, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { data: habits } = useHabits();

  const selectedDateStr = date ? format(date, "yyyy-MM-dd") : "";
  const selectedDate = date || new Date();
  
  const completedHabitsOnDate = habits?.filter(habit => 
    habit.completions.some(c => c.date === selectedDateStr)
  ) || [];

  const timedHabitsOnDate = habits?.filter(habit =>
    habit.status === "active" &&
    habit.scheduledTime &&
    matchesRecurrenceRule(habit.recurrenceRule, selectedDate)
  ) || [];

  const completedTimedIds = new Set(timedHabitsOnDate.filter(h => h.completions.some(c => c.date === selectedDateStr)).map(h => h.id));
  const untimedCompletedHabits = completedHabitsOnDate.filter(h => !h.scheduledTime);

  const hasActivity = untimedCompletedHabits.length > 0 || timedHabitsOnDate.length > 0;

  return (
    <AppLayout>
       <header className="mb-8">
          <h1 className="text-3xl font-bold font-display tracking-tight text-primary">Calendar</h1>
          <p className="mt-1 text-muted-foreground">Visualize your consistency.</p>
        </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-soft">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="w-full"
              classNames={{
                month: "space-y-4 w-full",
                table: "w-full border-collapse space-y-1",
                head_row: "flex w-full justify-between",
                row: "flex w-full mt-2 justify-between",
                cell: "h-12 w-12 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: "h-12 w-12 p-0 font-normal aria-selected:opacity-100 hover:bg-secondary rounded-xl transition-all",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground font-bold",
              }}
            />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl bg-secondary/30 p-6 border border-border/50 min-h-[400px]">
            <h3 className="font-semibold font-display text-lg mb-4">
              {date ? format(date, "MMMM do, yyyy") : "Select a date"}
            </h3>
            
            {hasActivity ? (
              <div className="space-y-3">
                {timedHabitsOnDate.length > 0 && (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" data-testid="text-calendar-scheduled-label">Scheduled</p>
                    {timedHabitsOnDate
                      .sort((a, b) => (a.scheduledTime || "").localeCompare(b.scheduledTime || ""))
                      .map((habit) => {
                        const isDone = completedTimedIds.has(habit.id);
                        return (
                          <motion.div 
                            key={habit.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={cn(
                              "flex items-center gap-3 rounded-xl bg-background p-3 shadow-sm border border-border/50",
                              isDone && "opacity-60"
                            )}
                            data-testid={`calendar-timed-habit-${habit.id}`}
                          >
                            <div className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full",
                              isDone
                                ? "bg-accent text-accent-foreground"
                                : "border-2 border-muted-foreground/30"
                            )}>
                              {isDone ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3 text-muted-foreground" />}
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className={cn("font-medium text-sm", isDone && "line-through text-muted-foreground")}>{habit.title}</span>
                              <span className="text-xs text-muted-foreground">{habit.scheduledTime}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                  </>
                )}
                {untimedCompletedHabits.length > 0 && (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-2" data-testid="text-calendar-completed-label">Completed</p>
                    <p className="text-sm text-muted-foreground mb-2" data-testid="text-calendar-completed-count">You completed {untimedCompletedHabits.length} rituals this day.</p>
                    {untimedCompletedHabits.map((habit) => (
                      <motion.div 
                        key={habit.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 rounded-xl bg-background p-3 shadow-sm border border-border/50"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground">
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="font-medium text-sm">{habit.title}</span>
                      </motion.div>
                    ))}
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
                 <Flame className="h-10 w-10 mb-2 opacity-20" />
                 <p>No activity recorded for this day.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
