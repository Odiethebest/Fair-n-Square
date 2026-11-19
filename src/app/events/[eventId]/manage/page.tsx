import type { EventStatus } from "@/domain/rubric";
import { getManageEvent } from "@/server/queries/events";

const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Draft",
  JUDGING: "Judging",
  CLOSED: "Closed",
  RELEASED: "Released",
};

export default async function ManageEventPage({
  params,
}: PageProps<"/events/[eventId]/manage">) {
  const { eventId } = await params;
  const event = await getManageEvent(eventId);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage event</p>
      <h1 className="mt-1 text-2xl font-semibold break-words">{event.name}</h1>

      <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">Status</dt>
          <dd className="mt-1 font-medium">{STATUS_LABELS[event.status]}</dd>
        </div>
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">
            Judges per team
          </dt>
          <dd className="mt-1 font-medium">{event.judgesPerTeam}</dd>
        </div>
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">
            Score scale
          </dt>
          <dd className="mt-1 font-medium">
            {event.scaleMin}–{event.scaleMax}
          </dd>
        </div>
      </dl>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Rubric</h2>
        <table className="mt-3 w-full text-left">
          <thead>
            <tr className="border-b border-zinc-200 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th scope="col" className="py-2 font-normal">
                Criterion
              </th>
              <th scope="col" className="py-2 text-right font-normal">
                Weight (%)
              </th>
            </tr>
          </thead>
          <tbody>
            {event.criteria.map((criterion) => (
              <tr
                key={criterion.name}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2 pr-4 break-words">{criterion.name}</td>
                <td className="py-2 text-right tabular-nums">
                  {criterion.weight}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
