import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Repeat, CalendarDays, CheckSquare, RefreshCw } from "lucide-react";
import { useConvertItem } from "@/hooks/use-convert-item";

type ItemType = "todo" | "habit" | "event" | "recurring_event";

const conversionOptions: Record<string, { type: ItemType; label: string; icon: typeof Repeat }[]> = {
  todo: [
    { type: "habit", label: "Habit", icon: Repeat },
    { type: "event", label: "One-off Event", icon: CalendarDays },
    { type: "recurring_event", label: "Recurring Event", icon: RefreshCw },
  ],
  event: [
    { type: "habit", label: "Habit", icon: Repeat },
    { type: "recurring_event", label: "Recurring Event", icon: RefreshCw },
  ],
  recurring_event: [
    { type: "habit", label: "Habit", icon: Repeat },
    { type: "todo", label: "To-Do", icon: CheckSquare },
  ],
  habit: [
    { type: "todo", label: "To-Do", icon: CheckSquare },
    { type: "recurring_event", label: "Recurring Event", icon: RefreshCw },
  ],
};

export function ConvertMenu({ itemId, currentType }: { itemId: number; currentType: string }) {
  const { mutate: convert, isPending } = useConvertItem();
  const options = conversionOptions[currentType];

  if (!options || options.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          disabled={isPending}
          data-testid={`button-convert-${itemId}`}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs">Convert to</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.type}
            onClick={() => convert({ id: itemId, type: opt.type })}
            data-testid={`menu-convert-${itemId}-${opt.type}`}
          >
            <opt.icon className="mr-2 h-3.5 w-3.5" />
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
