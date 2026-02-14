import { useHabits, useToggleHabit } from "@/hooks/use-habits";
import { format } from "date-fns";
import { Check, Clock, Flame, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function HabitList({ compact = false }: { compact?: boolean }) {
  const { data: habits, isLoading } = useHabits();
  const { mutate: toggle } = useToggleHabit();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-secondary/50" />
        ))}
      </div>
    );
  }

  if (!habits?.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
        <Trophy className="mb-4 h-12 w-12 opacity-20" />
        <p className="font-medium">No habits yet</p>
        <p className="text-sm">Start small. Create your first ritual.</p>
      </div>
    );
  }

  const activeHabits = habits.filter(h => h.status === "active");

  return (
    <div className="space-y-3">
      {activeHabits.map((habit) => {
        const isCompleted = habit.completions.some(c => c.date === todayStr);
        const streak = habit.completions.length;

        return (
          <motion.div 
            key={habit.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "group relative flex items-center justify-between overflow-hidden rounded-2xl border p-4 transition-all duration-300",
              isCompleted 
                ? "border-accent/50 bg-accent/10" 
                : "border-border bg-card hover:border-primary/20 hover:shadow-soft"
            )}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => toggle({ id: habit.id, date: today })}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isCompleted
                    ? "border-accent bg-accent text-accent-foreground scale-110"
                    : "border-muted-foreground/30 text-transparent hover:border-primary/50"
                )}
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </button>
              
              <div className="flex flex-col">
                <span className={cn(
                  "font-medium transition-all duration-300",
                  isCompleted ? "text-muted-foreground line-through decoration-accent/50 decoration-2" : "text-foreground"
                )}>
                  {habit.title}
                </span>
                {!compact && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground capitalize">{habit.recurrenceRule || "daily"}</span>
                    {habit.scheduledTime && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {habit.scheduledTime}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {streak > 0 && (
              <div className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-opacity",
                isCompleted ? "bg-accent/20 text-accent-foreground" : "bg-secondary text-muted-foreground"
              )}>
                <Flame className={cn("h-3 w-3", isCompleted && "fill-current")} />
                <span>{streak}</span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
