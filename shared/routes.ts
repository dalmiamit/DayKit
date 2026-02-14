import { z } from 'zod';
import { insertItemSchema, items, itemCompletions, type Item, type ItemCompletion } from './schema';

export type { Item, ItemCompletion };

export type Habit = Item & { completions: ItemCompletion[] };
export type HabitCompletion = ItemCompletion;
export type Todo = Item;

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  habits: {
    list: {
      method: 'GET' as const,
      path: '/api/habits',
      responses: {
        200: z.array(z.custom<Item & { completions: ItemCompletion[] }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/habits',
      input: insertItemSchema,
      responses: {
        201: z.custom<Item>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/habits/:id',
      input: insertItemSchema.partial().extend({ status: z.string().optional() }),
      responses: {
        200: z.custom<Item>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/habits/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    toggle: {
      method: 'POST' as const,
      path: '/api/habits/:id/toggle',
      input: z.object({ date: z.string() }),
      responses: {
        200: z.object({ completed: z.boolean() }),
        404: errorSchemas.notFound,
      },
    }
  },
  todos: {
    list: {
      method: 'GET' as const,
      path: '/api/todos',
      responses: {
        200: z.array(z.custom<Item>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/todos',
      input: insertItemSchema,
      responses: {
        201: z.custom<Item>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/todos/:id',
      input: insertItemSchema.partial().extend({ status: z.string().optional() }),
      responses: {
        200: z.custom<Item>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/todos/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  items: {
    scheduled: {
      method: 'GET' as const,
      path: '/api/items/scheduled',
      responses: {
        200: z.array(z.custom<Item>()),
      },
    },
    convert: {
      method: 'POST' as const,
      path: '/api/items/:id/convert',
      input: z.object({ type: z.enum(["todo", "habit", "event"]) }),
      responses: {
        200: z.custom<Item>(),
        400: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
