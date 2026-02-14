import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CalendarDays, Clock, Sun, CalendarRange } from "lucide-react";
import { format, nextSaturday } from "date-fns";

export type ScheduleMode = "none" | "date" | "datetime" | "weekend" | "week";

export interface ScheduleResult {
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  flexible?: boolean;
  deadlineDate?: string | null;
}

interface ScheduleOptionsProps {
  initialMode?: ScheduleMode;
  initialDate?: string;
  initialTime?: string;
  onChange: (result: ScheduleResult) => void;
}

export function getInitialMode(item?: { scheduledDate?: string | null; scheduledTime?: string | null; flexible?: boolean | null; deadlineDate?: string | null }): ScheduleMode {
  if (!item) return "none";
  if (item.deadlineDate) return "week";
  if (item.flexible && item.scheduledDate) return "weekend";
  if (item.scheduledDate && item.scheduledTime) return "datetime";
  if (item.scheduledDate) return "date";
  return "none";
}

export function ScheduleOptions({ initialMode = "none", initialDate = "", initialTime = "", onChange }: ScheduleOptionsProps) {
  const [mode, setMode] = useState<ScheduleMode>(initialMode);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);

  const today = format(new Date(), "yyyy-MM-dd");

  const handleModeChange = (newMode: ScheduleMode) => {
    setMode(newMode);
    if (newMode === "none") {
      onChange({ scheduledDate: null, scheduledTime: null, flexible: false, deadlineDate: null });
    } else if (newMode === "date") {
      onChange({ scheduledDate: date || today, scheduledTime: null, flexible: false, deadlineDate: null });
      if (!date) setDate(today);
    } else if (newMode === "datetime") {
      onChange({ scheduledDate: date || today, scheduledTime: time || "09:00", flexible: false, deadlineDate: null });
      if (!date) setDate(today);
      if (!time) setTime("09:00");
    } else if (newMode === "weekend") {
      const sat = format(nextSaturday(new Date()), "yyyy-MM-dd");
      onChange({ scheduledDate: sat, scheduledTime: null, flexible: true, deadlineDate: null });
    } else if (newMode === "week") {
      const deadline = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
      onChange({ scheduledDate: null, scheduledTime: null, flexible: false, deadlineDate: deadline });
    }
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (mode === "datetime") {
      onChange({ scheduledDate: newDate, scheduledTime: time || "09:00", flexible: false, deadlineDate: null });
    } else {
      onChange({ scheduledDate: newDate, scheduledTime: null, flexible: false, deadlineDate: null });
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    onChange({ scheduledDate: date || today, scheduledTime: newTime, flexible: false, deadlineDate: null });
  };

  return (
    <div className="space-y-3">
      <RadioGroup value={mode} onValueChange={(v) => handleModeChange(v as ScheduleMode)} className="space-y-2">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="none" id="schedule-none" data-testid="radio-schedule-none" />
          <Label htmlFor="schedule-none" className="text-sm text-foreground cursor-pointer">No schedule</Label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="date" id="schedule-date" data-testid="radio-schedule-date" />
            <Label htmlFor="schedule-date" className="text-sm text-foreground cursor-pointer flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              Specific date
            </Label>
          </div>
          {mode === "date" && (
            <div className="ml-6">
              <Input
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-auto"
                data-testid="input-schedule-date"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="datetime" id="schedule-datetime" data-testid="radio-schedule-datetime" />
            <Label htmlFor="schedule-datetime" className="text-sm text-foreground cursor-pointer flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Specific date + time
            </Label>
          </div>
          {mode === "datetime" && (
            <div className="ml-6 flex items-center gap-2 flex-wrap">
              <Input
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-auto"
                data-testid="input-schedule-datetime-date"
              />
              <Input
                type="time"
                value={time}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-auto"
                data-testid="input-schedule-datetime-time"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <RadioGroupItem value="weekend" id="schedule-weekend" data-testid="radio-schedule-weekend" />
          <Label htmlFor="schedule-weekend" className="text-sm text-foreground cursor-pointer flex items-center gap-1.5">
            <Sun className="h-3.5 w-3.5 text-muted-foreground" />
            This weekend
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <RadioGroupItem value="week" id="schedule-week" data-testid="radio-schedule-week" />
          <Label htmlFor="schedule-week" className="text-sm text-foreground cursor-pointer flex items-center gap-1.5">
            <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
            Within next 7 days
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
