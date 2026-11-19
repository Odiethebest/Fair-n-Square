"use client";

import { useActionState, useId, useState } from "react";
import {
  DEFAULT_JUDGES_PER_TEAM,
  DEFAULT_SCALE_MAX,
  DEFAULT_SCALE_MIN,
  MAX_CRITERIA,
  MAX_CRITERION_NAME_LENGTH,
  MAX_EVENT_NAME_LENGTH,
  MAX_JUDGES_PER_TEAM,
  MIN_JUDGES_PER_TEAM,
  SCALE_LOWER_BOUND,
  SCALE_UPPER_BOUND,
  TOTAL_WEIGHT,
} from "@/domain/rubric";
import { createEvent } from "@/server/actions/events";
import type {
  CreateEventError,
  CreateEventErrorCode,
  CreateEventState,
  EnteredValues,
} from "@/server/validation/create-event-form";

const ERROR_MESSAGES: Record<CreateEventErrorCode, string> = {
  invalid_request: "The form couldn't be read. Reload the page and try again.",
  event_name_required: "Enter an event name.",
  event_name_too_long: `Use ${MAX_EVENT_NAME_LENGTH} characters or fewer for the event name.`,
  criteria_missing: "Add at least one criterion.",
  criteria_too_many: `Use at most ${MAX_CRITERIA} criteria.`,
  criterion_name_required: "Enter a name for this criterion.",
  criterion_name_too_long: `Use ${MAX_CRITERION_NAME_LENGTH} characters or fewer for the criterion name.`,
  criterion_name_duplicate:
    "Another criterion already has this name. Names are compared ignoring case.",
  criterion_weight_invalid: "Weight must be a whole number greater than 0.",
  weights_sum_not_100: `Weights must add up to exactly ${TOTAL_WEIGHT}.`,
  judges_per_team_invalid: `Judges per team must be a whole number from ${MIN_JUDGES_PER_TEAM} to ${MAX_JUDGES_PER_TEAM}.`,
  scale_min_invalid: `Lowest score must be a whole number from ${SCALE_LOWER_BOUND} to ${SCALE_UPPER_BOUND}.`,
  scale_max_invalid: `Highest score must be a whole number from ${SCALE_LOWER_BOUND} to ${SCALE_UPPER_BOUND}.`,
  scale_min_not_below_max:
    "Lowest score must be below highest score. Blank fields use their defaults.",
};

const INITIAL_STATE: CreateEventState = { errors: [] };
const INTEGER_PATTERN = /^-?\d+$/;

type Row = { key: number; name: string; weight: string };
type RowField = "name" | "weight";

/** One empty row to start, or the submitted rows keyed by their position. */
function rowsFrom(entered: EnteredValues | undefined): Row[] {
  if (!entered) {
    return [{ key: 0, name: "", weight: "" }];
  }
  return entered.criteria.map((criterion, key) => ({
    key,
    name: criterion.name,
    weight: criterion.weight,
  }));
}

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900 aria-[invalid=true]:border-red-600 dark:aria-[invalid=true]:border-red-400";
const errorClass = "mt-1 text-sm text-red-700 dark:text-red-400";
const hintClass = "mt-1 text-sm text-zinc-500 dark:text-zinc-400";

export function CreateEventForm() {
  const [state, formAction, pending] = useActionState(
    createEvent,
    INITIAL_STATE,
  );
  // After a full-page POST the server renders this form with the action's
  // result as the initial state, so the fields start from what was entered.
  const [name, setName] = useState(state.entered?.name ?? "");
  const [judgesPerTeam, setJudgesPerTeam] = useState(
    state.entered?.judgesPerTeam ?? "",
  );
  const [scaleMin, setScaleMin] = useState(state.entered?.scaleMin ?? "");
  const [scaleMax, setScaleMax] = useState(state.entered?.scaleMax ?? "");
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(state.entered));
  // Keys of the rows that were submitted, in order. Row errors carry the
  // row's submitted index, so this keeps each error on its row after edits.
  const [submittedKeys, setSubmittedKeys] = useState<number[]>(
    () => state.entered?.criteria.map((_, index) => index) ?? [],
  );
  const id = useId();

  // Each new result carries what the server received. Adopt it, because
  // React may never have seen that text (typed before hydration) and would
  // otherwise redraw the fields from its own empty state.
  const [adoptedState, setAdoptedState] = useState(state);
  if (state !== adoptedState) {
    setAdoptedState(state);
    if (state.entered) {
      const entered = state.entered;
      const submittedRows = rowsFrom(entered);
      setName(entered.name);
      setJudgesPerTeam(entered.judgesPerTeam);
      setScaleMin(entered.scaleMin);
      setScaleMax(entered.scaleMax);
      setRows(submittedRows);
      setSubmittedKeys(submittedRows.map((row) => row.key));
    }
  }

  // Hide the last submit's errors while the next one is in flight, so the
  // live summary is announced again when the new result arrives.
  const errors = pending ? [] : state.errors;

  function fieldErrors(field: string): string[] {
    return errors
      .filter((e) => e.path.length === 1 && e.path[0] === field)
      .map((e) => ERROR_MESSAGES[e.code]);
  }

  function rowErrors(key: number, field: RowField): string[] {
    return errors
      .filter((e) => submittedRowKey(e) === key && e.path[2] === field)
      .map((e) => ERROR_MESSAGES[e.code]);
  }

  function submittedRowKey(error: CreateEventError): number | undefined {
    const [first, index] = error.path;
    return first === "criteria" && typeof index === "number"
      ? submittedKeys[index]
      : undefined;
  }

  const summary = errors.flatMap((error) => {
    const message = ERROR_MESSAGES[error.code];
    const key = submittedRowKey(error);
    if (key === undefined) {
      return [message];
    }
    const current = rows.findIndex((row) => row.key === key);
    // The row was removed after submitting, so its error no longer applies.
    return current === -1 ? [] : [`Criterion ${current + 1}: ${message}`];
  });

  const total = rows.reduce((sum, row) => {
    const weight = row.weight.trim();
    return INTEGER_PATTERN.test(weight) ? sum + Number(weight) : sum;
  }, 0);

  function updateRow(key: number, field: RowField, value: string) {
    setRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, [field]: value } : row,
      ),
    );
  }

  function addRow() {
    setRows((current) => {
      const key = current.reduce((max, row) => Math.max(max, row.key), -1) + 1;
      return [...current, { key, name: "", weight: "" }];
    });
  }

  function removeRow(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  const criteriaErrors = fieldErrors("criteria");

  return (
    <form action={formAction} className="mt-6 space-y-8">
      <TextField
        id={`${id}-name`}
        label="Event name"
        name="name"
        value={name}
        onChange={setName}
        errors={fieldErrors("name")}
      />

      <fieldset>
        <legend className="text-lg font-semibold">Rubric</legend>
        <p className={hintClass}>
          Up to {MAX_CRITERIA} criteria. Weights are percentages and must add up
          to {TOTAL_WEIGHT}.
        </p>

        {rows.length > 0 && (
          <div
            aria-hidden="true"
            className="mt-3 grid grid-cols-[minmax(0,1fr)_5rem_auto] gap-2 text-sm text-zinc-500 dark:text-zinc-400"
          >
            <span>Criterion</span>
            <span>Weight (%)</span>
            <span className="invisible">Remove</span>
          </div>
        )}

        <ol className="mt-1 space-y-3">
          {rows.map((row, index) => {
            const nameId = `${id}-criterion-${row.key}-name`;
            const weightId = `${id}-criterion-${row.key}-weight`;
            const nameErrors = rowErrors(row.key, "name");
            const weightErrors = rowErrors(row.key, "weight");
            return (
              <li key={row.key}>
                <div className="grid grid-cols-[minmax(0,1fr)_5rem_auto] items-start gap-2">
                  <div>
                    <label htmlFor={nameId} className="sr-only">
                      Criterion {index + 1} name
                    </label>
                    <input
                      id={nameId}
                      name="criterionName"
                      value={row.name}
                      onChange={(e) =>
                        updateRow(row.key, "name", e.target.value)
                      }
                      aria-invalid={nameErrors.length > 0}
                      aria-describedby={
                        nameErrors.length > 0 ? `${nameId}-error` : undefined
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor={weightId} className="sr-only">
                      Criterion {index + 1} weight
                    </label>
                    <input
                      id={weightId}
                      name="criterionWeight"
                      inputMode="numeric"
                      value={row.weight}
                      onChange={(e) =>
                        updateRow(row.key, "weight", e.target.value)
                      }
                      aria-invalid={weightErrors.length > 0}
                      aria-describedby={
                        weightErrors.length > 0
                          ? `${weightId}-error`
                          : undefined
                      }
                      className={`${inputClass} tabular-nums`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    aria-label={`Remove criterion ${index + 1}`}
                    className="rounded-md px-2 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Remove
                  </button>
                </div>
                {nameErrors.length > 0 && (
                  <p id={`${nameId}-error`} className={errorClass}>
                    {nameErrors.join(" ")}
                  </p>
                )}
                {weightErrors.length > 0 && (
                  <p id={`${weightId}-error`} className={errorClass}>
                    {weightErrors.join(" ")}
                  </p>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={addRow}
            disabled={rows.length >= MAX_CRITERIA}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Add criterion
          </button>
          <p
            className={`text-sm font-medium tabular-nums ${
              total === TOTAL_WEIGHT
                ? "text-green-700 dark:text-green-400"
                : "text-zinc-600 dark:text-zinc-300"
            }`}
          >
            Total: {total} / {TOTAL_WEIGHT}
          </p>
        </div>
        {criteriaErrors.map((message) => (
          <p key={message} className={errorClass}>
            {message}
          </p>
        ))}
      </fieldset>

      <fieldset>
        <legend className="text-lg font-semibold">Settings</legend>
        <p className={hintClass}>Leave a setting blank to use its default.</p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField
            id={`${id}-judges-per-team`}
            label="Judges per team"
            name="judgesPerTeam"
            value={judgesPerTeam}
            onChange={setJudgesPerTeam}
            numeric
            placeholder={String(DEFAULT_JUDGES_PER_TEAM)}
            hint={`${MIN_JUDGES_PER_TEAM}–${MAX_JUDGES_PER_TEAM}, default ${DEFAULT_JUDGES_PER_TEAM}`}
            errors={fieldErrors("judgesPerTeam")}
          />
          <TextField
            id={`${id}-scale-min`}
            label="Lowest score"
            name="scaleMin"
            value={scaleMin}
            onChange={setScaleMin}
            numeric
            placeholder={String(DEFAULT_SCALE_MIN)}
            hint={`Default ${DEFAULT_SCALE_MIN}`}
            errors={fieldErrors("scaleMin")}
          />
          <TextField
            id={`${id}-scale-max`}
            label="Highest score"
            name="scaleMax"
            value={scaleMax}
            onChange={setScaleMax}
            numeric
            placeholder={String(DEFAULT_SCALE_MAX)}
            hint={`Default ${DEFAULT_SCALE_MAX}`}
            errors={fieldErrors("scaleMax")}
          />
        </div>
      </fieldset>

      <div aria-live="polite">
        {summary.length > 0 && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <p className="font-medium">
              Nothing was saved. Fix {summary.length === 1 ? "this" : "these"}{" "}
              and submit again:
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {summary.map((message, i) => (
                <li key={i}>{message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}

function TextField(props: {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  errors: string[];
  numeric?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  const hintId = `${props.id}-hint`;
  const errorId = `${props.id}-error`;
  const describedBy = [
    props.hint ? hintId : null,
    props.errors.length > 0 ? errorId : null,
  ]
    .filter((value) => value !== null)
    .join(" ");

  return (
    <div>
      <label htmlFor={props.id} className="block font-medium">
        {props.label}
      </label>
      <input
        id={props.id}
        name={props.name}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        inputMode={props.numeric ? "numeric" : undefined}
        placeholder={props.placeholder}
        aria-invalid={props.errors.length > 0}
        aria-describedby={describedBy || undefined}
        className={`mt-1 ${inputClass}`}
      />
      {props.hint && (
        <p id={hintId} className={hintClass}>
          {props.hint}
        </p>
      )}
      {props.errors.length > 0 && (
        <p id={errorId} className={errorClass}>
          {props.errors.join(" ")}
        </p>
      )}
    </div>
  );
}
