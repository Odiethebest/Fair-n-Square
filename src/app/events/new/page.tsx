import { CreateEventForm } from "@/app/events/new/create-event-form";
import { requireUser } from "@/server/auth";

export default async function NewEventPage() {
  await requireUser();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Create an event</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Every judge scores the same criteria. Weights must add up to 100.
      </p>
      <CreateEventForm />
    </main>
  );
}
