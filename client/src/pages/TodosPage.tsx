import { AppLayout } from "@/components/layout/AppLayout";
import { TodoList } from "@/components/todos/TodoList";

export default function TodosPage() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold font-display tracking-tight text-primary">To-Dos</h1>
          <p className="mt-2 text-muted-foreground">Clear your mind. Capture your tasks.</p>
        </header>

        <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-soft">
          <TodoList />
        </div>
      </div>
    </AppLayout>
  );
}
