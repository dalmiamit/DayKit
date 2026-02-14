import { pgTable, text, serial, integer, boolean as pgBoolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull().default("todo"),
  scheduledDate: text("scheduled_date"),
  scheduledTime: text("scheduled_time"),
  recurrenceRule: text("recurrence_rule"),
  flexible: pgBoolean("flexible").default(false),
  deadlineDate: text("deadline_date"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const itemCompletions = pgTable("item_completions", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  date: text("date").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
  notes: text("notes"),
});

export const itemsRelations = relations(items, ({ many }) => ({
  completions: many(itemCompletions),
}));

export const itemCompletionsRelations = relations(itemCompletions, ({ one }) => ({
  item: one(items, {
    fields: [itemCompletions.itemId],
    references: [items.id],
  }),
}));

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  userId: true,
});

export const insertItemCompletionSchema = createInsertSchema(itemCompletions).omit({
  id: true,
  completedAt: true,
});

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type ItemCompletion = typeof itemCompletions.$inferSelect;

export type Habit = Item & { completions: ItemCompletion[] };
export type HabitCompletion = ItemCompletion;
export type Todo = Item;
export type InsertHabit = InsertItem;
export type InsertTodo = InsertItem;
