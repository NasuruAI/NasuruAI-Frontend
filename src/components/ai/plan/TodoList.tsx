"use client";

import { ArrowRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { type Todo, useSetTodo } from "@/lib/ai/plan";
import { Checkbox } from "../choice";
import { EmptyState, InlineAlert } from "../feedback";
import { useToast } from "../Toast";

function TodoRow({
  todo,
  onToggle,
}: {
  todo: Todo;
  onToggle: (todo: Todo, done: boolean) => void;
}) {
  const done = todo.status === "done";
  return (
    <li className="py-3">
      <Checkbox
        checked={done}
        onChange={(checked) => onToggle(todo, checked)}
        label={<span className={done ? "text-muted line-through" : "text-ink"}>{todo.title}</span>}
        description={todo.detail ? `Or: ${todo.detail}` : undefined}
      />
      {todo.route_code && !done && (
        <Link
          href={`/ai/routes/${todo.route_code}`}
          className="mt-1 ml-9 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
        >
          How to do this <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      )}
    </li>
  );
}

/**
 * The plan's to-dos: open ones first, done and no-longer-needed ones folded
 * away. Ticking saves at once, with Undo in the toast.
 */
export function TodoList({ todos }: { todos: Todo[] }) {
  const setTodo = useSetTodo();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  const open = todos.filter((todo) => todo.status === "open");
  const done = todos.filter((todo) => todo.status === "done");
  const resolved = todos.filter((todo) => todo.status === "resolved");

  function fail(err: unknown) {
    setError(
      err instanceof ApiError && err.status === 409
        ? "That changed on another device. We've loaded the latest list."
        : "That didn't save. Check your connection and try again.",
    );
  }

  function toggle(todo: Todo, isDone: boolean) {
    setError(null);
    const saved = setTodo.mutateAsync({ todo, done: isDone });
    saved.catch(fail);
    if (isDone) {
      toast({
        message: `Done: ${todo.title}`,
        action: {
          label: "Undo",
          // Undo sends the version the tick produced, so it can't clobber a newer change.
          onClick: () =>
            void saved
              .then((ticked) => setTodo.mutateAsync({ todo: ticked, done: false }))
              .catch(fail),
        },
      });
    }
  }

  if (!todos.length) {
    return (
      <EmptyState icon={<CircleCheck />} title="Nothing to do right now">
        Your pathway has no gaps to close. New steps appear here when a rule or your profile
        changes.
      </EmptyState>
    );
  }

  return (
    <div>
      {error && <InlineAlert tone="danger" title={error} className="mb-3" />}
      {open.length ? (
        <ul className="divide-y divide-line">
          {open.map((todo) => (
            <TodoRow key={todo.id} todo={todo} onToggle={toggle} />
          ))}
        </ul>
      ) : (
        <p className="py-3 text-body text-success">Everything on your list is done.</p>
      )}
      {done.length > 0 && (
        <details className="mt-3 rounded-r-md border border-line">
          <summary className="cursor-pointer px-4 py-3 text-body-s font-semibold text-muted">
            Done ({done.length})
          </summary>
          <ul className="divide-y divide-line px-4">
            {done.map((todo) => (
              <TodoRow key={todo.id} todo={todo} onToggle={toggle} />
            ))}
          </ul>
        </details>
      )}
      {resolved.length > 0 && (
        <details className="mt-3 rounded-r-md border border-line">
          <summary className="cursor-pointer px-4 py-3 text-body-s font-semibold text-muted">
            No longer needed ({resolved.length})
          </summary>
          <ul className="space-y-2 px-4 pb-3 text-body-s text-muted">
            {resolved.map((todo) => (
              <li key={todo.id}>{todo.title}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
