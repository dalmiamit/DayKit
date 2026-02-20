import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCreateHabit } from "@/hooks/use-habits";
import { useCreateTodo } from "@/hooks/use-todos";
import { useCreateRecurringEvent } from "@/hooks/use-recurring-events";
import { Plus, Loader2, Clock, Repeat, Calendar, CheckSquare, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

type Tab = "habit" | "event" | "recurring" | "todo";

const DAY_OPTIONS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const HABIT_RECURRENCE_OPTIONS = [
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays (Mon–Fri)" },
  { value: "weekends", label: "Weekends (Sat–Sun)" },
  { value: "monday", label: "Every Monday" },
  { value: "tuesday", label: "Every Tuesday" },
  { value: "wednesday", label: "Every Wednesday" },
  { value: "thursday", label: "Every Thursday" },
  { value: "friday", label: "Every Friday" },
  { value: "saturday", label: "Every Saturday" },
  { value: "sunday", label: "Every Sunday" },
  { value: "weekly-flexible", label: "Once a week (any day)" },
];

function HabitForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [recurrence, setRecurrence] = useState("daily");
  const [time, setTime] = useState("");
  const { mutate, isPending } = useCreateHabit();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    mutate(
      { title, recurrenceRule: recurrence, scheduledTime: time || null },
      { onSuccess }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Habit Name</Label>
        <Input
          placeholder="e.g. Take vitamin D"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="h-11 rounded-xl border-border bg-secondary/30"
          data-testid="input-habit-title"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Schedule</Label>
        <Select value={recurrence} onValueChange={setRecurrence}>
          <SelectTrigger className="h-11 rounded-xl border-border bg-secondary/30" data-testid="select-habit-frequency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HABIT_RECURRENCE_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {recurrence === "weekly-flexible" && (
          <p className="text-xs text-muted-foreground/70">Shows every day until you check it off once this week.</p>
        )}
      </div>
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          Time <span className="font-normal normal-case">(optional)</span>
        </Label>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="w-auto"
            data-testid="input-habit-time"
          />
          {time && <Button type="button" variant="ghost" size="sm" onClick={() => setTime("")} className="text-xs text-muted-foreground">Clear</Button>}
        </div>
        {time && <p className="text-xs text-muted-foreground/70">Habit will appear in the Scheduled section at {time}.</p>}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending || !title.trim()} className="rounded-xl px-6" data-testid="button-create-habit">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Habit"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function RecurringEventForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly");
  const [day, setDay] = useState("sunday");
  const [time, setTime] = useState("");
  const { mutate, isPending } = useCreateRecurringEvent();

  const recurrenceRule = frequency === "monthly" ? `monthly-${day}` : day;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    mutate(
      { title, recurrenceRule, scheduledTime: time || null },
      { onSuccess }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Event Name</Label>
        <Input
          placeholder="e.g. Grocery run"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="h-11 rounded-xl border-border bg-secondary/30"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Frequency</Label>
          <Select value={frequency} onValueChange={v => setFrequency(v as "weekly" | "monthly")}>
            <SelectTrigger className="h-11 rounded-xl border-border bg-secondary/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Day</Label>
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger className="h-11 rounded-xl border-border bg-secondary/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {frequency === "monthly" && (
        <p className="text-xs text-muted-foreground/70">
          Shows on the first {DAY_OPTIONS.find(d => d.value === day)?.label} of each month.
        </p>
      )}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          Time <span className="font-normal normal-case">(optional)</span>
        </Label>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="w-auto"
          />
          {time && <Button type="button" variant="ghost" size="sm" onClick={() => setTime("")} className="text-xs text-muted-foreground">Clear</Button>}
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending || !title.trim()} className="rounded-xl px-6">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Event"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function OneOffEventForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("");
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        type: "event",
        scheduledDate: date,
        scheduledTime: time || null,
      }),
      credentials: "include",
    });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["/api/items/scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Event Name</Label>
        <Input
          placeholder="e.g. Doctor visit"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="h-11 rounded-xl border-border bg-secondary/30"
          data-testid="input-event-title"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Date</Label>
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="h-11 rounded-xl border-border bg-secondary/30"
            data-testid="input-event-date"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Time <span className="font-normal normal-case">(optional)</span>
          </Label>
          <Input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="h-11 rounded-xl border-border bg-secondary/30"
            data-testid="input-event-time"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={!title.trim()} className="rounded-xl px-6" data-testid="button-create-event">
          Add Event
        </Button>
      </DialogFooter>
    </form>
  );
}

function TodoForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const { mutate, isPending } = useCreateTodo();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    mutate({ title }, { onSuccess });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Task</Label>
        <Input
          placeholder="e.g. Go to the tailor"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="h-11 rounded-xl border-border bg-secondary/30"
          data-testid="input-todo-title"
          autoFocus
        />
        <p className="text-xs text-muted-foreground/70">No date or time commitment. Captured for when you're ready.</p>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending || !title.trim()} className="rounded-xl px-6" data-testid="button-create-todo">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add To-do"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CreateItemDialog() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("habit");

  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-soft hover:shadow-md transition-all" data-testid="button-create-item">
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add something</DialogTitle>
          <DialogDescription>Choose what you're adding.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={v => setTab(v as Tab)} className="mt-2">
          <TabsList className="grid grid-cols-4 w-full h-auto rounded-xl bg-secondary/40 p-1">
            <TabsTrigger value="habit" className="rounded-lg text-xs flex flex-col gap-0.5 py-2 h-auto data-[state=active]:shadow-sm">
              <Repeat className="h-3.5 w-3.5" />
              Habit
            </TabsTrigger>
            <TabsTrigger value="recurring" className="rounded-lg text-xs flex flex-col gap-0.5 py-2 h-auto data-[state=active]:shadow-sm">
              <RefreshCw className="h-3.5 w-3.5" />
              Recurring
            </TabsTrigger>
            <TabsTrigger value="event" className="rounded-lg text-xs flex flex-col gap-0.5 py-2 h-auto data-[state=active]:shadow-sm">
              <Calendar className="h-3.5 w-3.5" />
              Event
            </TabsTrigger>
            <TabsTrigger value="todo" className="rounded-lg text-xs flex flex-col gap-0.5 py-2 h-auto data-[state=active]:shadow-sm">
              <CheckSquare className="h-3.5 w-3.5" />
              To-do
            </TabsTrigger>
          </TabsList>

          <TabsContent value="habit">
            <div className="text-xs text-muted-foreground/70 mt-3 mb-1">A behaviour you want to build and track.</div>
            <HabitForm onSuccess={close} />
          </TabsContent>

          <TabsContent value="recurring">
            <div className="text-xs text-muted-foreground/70 mt-3 mb-1">A calendar event that repeats (not a habit to track).</div>
            <RecurringEventForm onSuccess={close} />
          </TabsContent>

          <TabsContent value="event">
            <div className="text-xs text-muted-foreground/70 mt-3 mb-1">A one-off event on a specific date.</div>
            <OneOffEventForm onSuccess={close} />
          </TabsContent>

          <TabsContent value="todo">
            <div className="text-xs text-muted-foreground/70 mt-3 mb-1">A task with no specific day or time commitment.</div>
            <TodoForm onSuccess={close} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
