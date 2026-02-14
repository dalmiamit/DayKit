import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateHabit } from "@/hooks/use-habits";
import { Plus, Loader2, Clock } from "lucide-react";

export function CreateHabitDialog() {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useCreateHabit();
  const [title, setTitle] = useState("");
  const [recurrence, setRecurrence] = useState("daily");
  const [hasTime, setHasTime] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("09:00");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    mutate({
      title,
      recurrenceRule: recurrence,
      scheduledTime: hasTime ? scheduledTime : null,
    }, {
      onSuccess: () => {
        setOpen(false);
        setTitle("");
        setRecurrence("daily");
        setHasTime(false);
        setScheduledTime("09:00");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-soft hover:shadow-md transition-all">
          <Plus className="mr-2 h-4 w-4" /> New Habit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create a Ritual</DialogTitle>
          <DialogDescription>
            What is a small habit you want to build?
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Habit Name</Label>
            <Input
              id="title"
              placeholder="e.g. Read 10 pages"
              className="h-12 rounded-xl border-border bg-secondary/30 focus:bg-background transition-colors"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-habit-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="frequency" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Frequency</Label>
            <Select onValueChange={setRecurrence} defaultValue={recurrence}>
              <SelectTrigger className="h-12 rounded-xl border-border bg-secondary/30" data-testid="select-habit-frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="has-time"
                checked={hasTime}
                onCheckedChange={(v) => setHasTime(v === true)}
                data-testid="checkbox-habit-has-time"
              />
              <Label htmlFor="has-time" className="text-sm text-foreground cursor-pointer flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Set a specific time
              </Label>
            </div>
            {hasTime && (
              <div className="ml-6">
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-auto"
                  data-testid="input-habit-time"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Timed habits appear in your scheduled timeline
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !title.trim()} className="rounded-xl px-6" data-testid="button-create-habit">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
