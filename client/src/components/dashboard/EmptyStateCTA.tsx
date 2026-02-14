import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { useCreateHabit } from "@/hooks/use-habits";
import { useCreateTodo } from "@/hooks/use-todos";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Sparkles, ListTodo, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

type DialogType = "habit" | "task" | null;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function EmptyStateCTA() {
  const { user } = useAuth();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  
  const [habitTitle, setHabitTitle] = useState("");
  const [habitFrequency, setHabitFrequency] = useState<"daily" | "weekly">("daily");
  
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState<Date | undefined>(undefined);
  
  const { mutate: createHabit, isPending: isCreatingHabit } = useCreateHabit();
  const { mutate: createTodo, isPending: isCreatingTask } = useCreateTodo();

  const openDialog = (type: DialogType) => {
    setPopoverOpen(false);
    setDialogType(type);
  };

  const closeDialog = () => {
    setDialogType(null);
    setHabitTitle("");
    setHabitFrequency("daily");
    setTaskTitle("");
    setTaskDate(undefined);
  };

  const handleCreateHabit = () => {
    if (!habitTitle.trim()) return;
    createHabit({ title: habitTitle, recurrenceRule: habitFrequency }, {
      onSuccess: closeDialog
    });
  };

  const handleCreateTask = () => {
    if (!taskTitle.trim()) return;
    createTodo({ title: taskTitle, scheduledDate: taskDate ? format(taskDate, "yyyy-MM-dd") : undefined }, {
      onSuccess: closeDialog
    });
  };

  const choices = [
    {
      type: "habit" as const,
      icon: Sparkles,
      label: "A habit I want to build",
      description: "Something to do regularly"
    },
    {
      type: "task" as const,
      icon: ListTodo,
      label: "A task to get done",
      description: "Something on your list"
    }
  ];

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center justify-center text-center py-16 px-4"
      >
        <div className="max-w-md space-y-6">
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
            {getGreeting()}, {user?.firstName || "Friend"}.
          </h1>
          <p className="text-lg text-muted-foreground">
            What would you like to start with today?
          </p>
          
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                size="lg" 
                className="rounded-xl shadow-md hover:shadow-lg transition-all mt-4 px-6"
                data-testid="button-add-something"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add something to your day
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-72 p-2" 
              align="center"
              sideOffset={8}
            >
              <div className="space-y-1">
                {choices.map((choice) => (
                  <button
                    key={choice.type}
                    onClick={() => openDialog(choice.type)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover-elevate"
                    data-testid={`button-add-${choice.type}`}
                  >
                    <choice.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium text-sm">{choice.label}</div>
                      <div className="text-xs text-muted-foreground">{choice.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </motion.div>

      <Dialog open={dialogType === "habit"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Start a new ritual</DialogTitle>
            <DialogDescription>
              What's a small habit you want to build?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                What will you do?
              </Label>
              <Input
                placeholder="e.g. Read for 10 minutes"
                value={habitTitle}
                onChange={(e) => setHabitTitle(e.target.value)}
                className="h-12 rounded-xl"
                data-testid="input-habit-title"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                How often?
              </Label>
              <Select value={habitFrequency} onValueChange={(v) => setHabitFrequency(v as "daily" | "weekly")}>
                <SelectTrigger className="h-12 rounded-xl" data-testid="select-habit-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Every day</SelectItem>
                  <SelectItem value="weekly">Every week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
            <Button 
              onClick={handleCreateHabit} 
              disabled={!habitTitle.trim() || isCreatingHabit}
              className="rounded-xl px-6"
              data-testid="button-create-habit"
            >
              {isCreatingHabit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === "task"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add a task</DialogTitle>
            <DialogDescription>
              What do you need to get done?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                Task
              </Label>
              <Input
                placeholder="e.g. Reply to emails"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="h-12 rounded-xl"
                data-testid="input-task-title"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                Due date (optional)
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl justify-start font-normal"
                    data-testid="button-select-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {taskDate ? format(taskDate, "MMMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={taskDate}
                    onSelect={setTaskDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
            <Button 
              onClick={handleCreateTask} 
              disabled={!taskTitle.trim() || isCreatingTask}
              className="rounded-xl px-6"
              data-testid="button-create-task"
            >
              {isCreatingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
