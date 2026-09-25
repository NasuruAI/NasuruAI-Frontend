"use client";

import {
  ArrowLeft,
  Check,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  CircleX,
  ExternalLink,
  FileCheck2,
  Flag as FlagIcon,
  Plus,
  Quote,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { usePlan } from "@/lib/ai/plan";
import {
  type Citation,
  isGate,
  type PublicRule,
  type TraceLine,
  type TraceRule,
  useAddTodo,
  useAnswer,
  useAsk,
  useChecklist,
  useEligibilityDetail,
  useRouteDetail,
} from "@/lib/ai/routes";
import { useRuleChanges } from "@/lib/ai/shell";
import { Button } from "../Button";
import { cx } from "../cx";
import { formatDate } from "../evidence/format";
import { DiffView, SourceLine } from "../evidence/Source";
import { StatusPill, type StatusKind } from "../evidence/Status";
import { EmptyState, InlineAlert, ProgressBar, Skeleton } from "../feedback";
import { TextArea } from "../fields";
import { TabPanel, Tabs } from "../Tabs";
import { useToast } from "../Toast";

type Tab = "requirements" | "gaps" | "checklist" | "guide" | "changes";

const STATUSES = new Set(["eligible", "eligible_if", "not_eligible", "blocked"]);

/** A value a rule read or needs, as a person would write it. */
export function formatValue(value: unknown, unit = ""): string {
  if (value === null || value === undefined || value === "") return "Not known";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return `${value.toLocaleString("en-GB")}${unit ? ` ${unit}` : ""}`;
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${humanise(key)}: ${formatValue(item)}`)
      .join("; ");
  }
  return `${String(value)}${unit ? ` ${unit}` : ""}`;
}

/** "english_level" -> "English level"; "profile.age" -> "Age". */
export function humanise(key: string): string {
  const last = key.split(".").pop() ?? key;
  const words = last.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const OUTCOME = {
  pass: { Icon: CircleCheck, word: "Met", className: "text-success" },
  fail: { Icon: CircleX, word: "Not met", className: "text-danger" },
  unknown: { Icon: CircleHelp, word: "Not known yet", className: "text-warning" },
} as const;

function Outcome({ outcome }: { outcome: TraceRule["outcome"] }) {
  const { Icon, word, className } = OUTCOME[outcome];
  return (
    <span className={cx("inline-flex items-center gap-1.5 font-semibold", className)}>
      <Icon aria-hidden className="size-4 shrink-0" />
      {word}
    </span>
  );
}

function Requirements({ trace, rules }: { trace: TraceLine[] | null; rules: PublicRule[] }) {
  const lines = trace?.filter((line): line is TraceRule => !isGate(line)) ?? null;
  const gates = trace?.filter(isGate) ?? [];
  if (!lines && !rules.length) {
    return (
      <p className="text-body text-muted">
        This route&apos;s rules haven&apos;t been published yet.
      </p>
    );
  }
  return (
    <div className="space-y-5">
      {gates.map((gate) => (
        <InlineAlert
          key={gate.gate}
          tone={gate.effect === "blocked" ? "danger" : "warning"}
          title={
            gate.effect === "blocked" ? "Closed to your nationality" : "A nationality rule applies"
          }
        >
          {gate.note}
          <SourceLine
            className="mt-1"
            source={{
              name: gate.source_name,
              url: gate.source_url,
              checkedOn: gate.verified_at,
              stale: gate.is_stale,
            }}
          />
        </InlineAlert>
      ))}
      <div className="relative overflow-x-auto rounded-r-md border border-line">
        <table className="w-full min-w-[40rem] text-left text-body-s">
          <caption className="sr-only">
            Each requirement, your value and whether you meet it
          </caption>
          <thead className="bg-sunken text-muted">
            <tr>
              <th scope="col" className="px-4 py-2 font-semibold">
                Requirement
              </th>
              {lines && (
                <th scope="col" className="px-4 py-2 font-semibold">
                  You
                </th>
              )}
              {lines && (
                <th scope="col" className="px-4 py-2 font-semibold">
                  Result
                </th>
              )}
              <th scope="col" className="px-4 py-2 font-semibold">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(lines ?? rules).map((rule) => (
              <tr key={rule.key} className="align-top">
                <td className="px-4 py-3 text-ink">
                  <span className="block">{rule.description}</span>
                  {rule.value !== null && rule.value !== undefined && rule.value !== "" && (
                    <span className="mt-0.5 block text-caption text-muted">
                      Needs: {formatValue(rule.value, rule.unit)}
                    </span>
                  )}
                </td>
                {lines && (
                  <td className="px-4 py-3 text-ink">
                    {Object.keys((rule as TraceRule).inputs ?? {}).length
                      ? Object.entries((rule as TraceRule).inputs).map(([key, value]) => (
                          <span key={key} className="block">
                            <span className="text-muted">{humanise(key)}:</span>{" "}
                            {formatValue(value)}
                          </span>
                        ))
                      : "—"}
                  </td>
                )}
                {lines && (
                  <td className="px-4 py-3">
                    <Outcome outcome={(rule as TraceRule).outcome} />
                  </td>
                )}
                <td className="px-4 py-3">
                  <SourceLine
                    source={{
                      name: rule.source_name,
                      url: rule.source_url,
                      checkedOn: rule.verified_at,
                      stale: rule.is_stale,
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lines && lines.length > 0 && (
        <details className="rounded-r-md border border-line">
          <summary className="cursor-pointer px-4 py-3 text-body-s font-semibold text-accent">
            How we worked this out
          </summary>
          <div className="space-y-3 px-4 pb-4 text-body-s">
            <p className="text-muted">
              Each rule is checked against the details you confirmed. The same details and the same
              rules always give the same answer.
            </p>
            <ol className="space-y-2">
              {lines.map((line) => (
                <li key={line.version_id} className="rounded-r-sm bg-sunken p-3">
                  <p className="font-semibold text-ink">{line.description}</p>
                  <p className="text-muted">
                    Read{" "}
                    {Object.keys(line.inputs ?? {}).length
                      ? Object.entries(line.inputs)
                          .map(([key, value]) => `${humanise(key)} = ${formatValue(value)}`)
                          .join(", ")
                      : "nothing from your profile"}
                    ; compared with {formatValue(line.value, line.unit)}; result:{" "}
                    {OUTCOME[line.outcome].word.toLowerCase()}.
                  </p>
                  <p className="text-caption text-subtle">
                    Rule {line.key}, version {line.version_id.slice(0, 8)}, verified{" "}
                    {formatDate(line.verified_at)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </details>
      )}
    </div>
  );
}

function Gaps({
  code,
  gaps,
  status,
}: {
  code: string;
  gaps: { key: string; text: string; alternatives?: string[]; unknown?: boolean }[];
  status: string;
}) {
  const plan = usePlan();
  const add = useAddTodo();
  const toast = useToast();
  const [added, setAdded] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const keys = new Set((plan.data?.todos ?? []).map((todo) => todo.key));
  const inPlan = (key: string) =>
    added.has(key) || keys.has(`${code}:${key}`) || keys.has(`added:${code}:${key}`);
  const own = gaps.filter((gap) => gap.key !== "stale" && gap.key !== "rules_pending");

  if (!own.length) {
    return (
      <EmptyState
        icon={<CircleCheck />}
        title={status === "eligible" ? "No gaps" : "Nothing you can close"}
      >
        {status === "eligible"
          ? "You meet every requirement we check for this route."
          : status === "blocked"
            ? "This route is closed to your nationality, so there's nothing to add."
            : "What stands in the way can't be changed by you. The requirements tab says why."}
      </EmptyState>
    );
  }

  function addGap(gap: (typeof own)[number]) {
    setError(null);
    add.mutate(
      {
        key: `${code}:${gap.key}`,
        title: gap.text,
        detail: (gap.alternatives ?? []).join(" Or: "),
        route: code,
      },
      {
        onSuccess: () => {
          setAdded((current) => new Set(current).add(gap.key));
          toast({ message: `Added to your plan: ${gap.text}` });
        },
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "That didn't save. Try again."),
      },
    );
  }

  return (
    <div className="space-y-3">
      {error && <InlineAlert tone="danger" title={error} />}
      {own.map((gap) => (
        <article key={gap.key} className="rounded-r-md border border-line p-4">
          <h2 className="flex items-start gap-2 font-semibold text-ink">
            <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0 text-info" />
            {gap.text}
          </h2>
          {gap.unknown && (
            <p className="mt-1 text-body-s text-muted">
              We don&apos;t know yet whether you meet this. Confirming the details it needs in your
              profile settles it.
            </p>
          )}
          {!!gap.alternatives?.length && (
            <p className="mt-1 text-body-s text-muted">Or: {gap.alternatives.join(" Or: ")}</p>
          )}
          <div className="mt-3">
            {inPlan(gap.key) ? (
              <p className="flex items-center gap-1.5 text-body-s font-semibold text-success">
                <Check aria-hidden className="size-4" /> In your plan
              </p>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus aria-hidden className="size-4" />}
                loading={add.isPending && add.variables?.key === `${code}:${gap.key}`}
                onClick={() => addGap(gap)}
              >
                Add to plan
              </Button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function ChecklistTab({ code }: { code: string }) {
  const checklist = useChecklist(code);
  if (checklist.isPending) return <Skeleton className="h-40 w-full" />;
  if (checklist.isError)
    return <InlineAlert tone="danger" title="We couldn't load the checklist." />;
  const { items, done, total } = checklist.data;
  if (!items.length) {
    return (
      <p className="text-body text-muted">
        Our researchers haven&apos;t written this route&apos;s checklist yet.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <ProgressBar value={done} max={total} label={`${done} of ${total} ready`} />
      <ul className="divide-y divide-line rounded-r-md border border-line">
        {items.map((item) => (
          <li key={item.key} className="flex gap-3 p-4">
            {item.status === "done" ? (
              <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
            ) : (
              <CircleDashed aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                {item.title}
                <span className="sr-only">{item.status === "done" ? " (ready)" : " (to do)"}</span>
              </p>
              {item.detail && <p className="text-body-s text-muted">{item.detail}</p>}
              {item.why && (
                <p
                  className={cx(
                    "mt-1 text-body-s",
                    item.status === "done" ? "text-success" : "text-ink",
                  )}
                >
                  {item.why}
                </p>
              )}
              <SourceLine
                className="mt-1"
                source={{ name: "Official page", url: item.source_url, stale: item.stale }}
              />
            </div>
          </li>
        ))}
      </ul>
      <Link
        href="/ai/documents"
        className="inline-flex items-center gap-1.5 text-body-s font-semibold text-accent hover:underline"
      >
        <FileCheck2 aria-hidden className="size-4" /> Your documents
      </Link>
    </div>
  );
}

function Guide({ code, summary }: { code: string; summary: string }) {
  const ask = useAsk();
  const [question, setQuestion] = useState("");
  const [answerId, setAnswerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const answer = useAnswer(answerId);
  const data = answer.data ?? ask.data;
  const disclaimer = (data as { disclaimer?: string } | undefined)?.disclaimer;
  const citations = (Array.isArray(data?.citations) ? data.citations : []) as Citation[];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (question.trim().length < 8) {
      setError("Ask a full question, e.g. “Can my spouse work on this visa?”");
      return;
    }
    setError(null);
    ask.mutate(
      { route: code, question: question.trim() },
      {
        onSuccess: (result) => setAnswerId(result.id),
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "We couldn't send that. Try again."),
      },
    );
  }

  return (
    <div className="space-y-6">
      {summary && <p className="max-w-[70ch] text-body text-ink whitespace-pre-line">{summary}</p>}
      <form
        noValidate
        onSubmit={submit}
        className="space-y-3 rounded-r-md border border-line bg-surface p-5"
      >
        <h2 className="text-h3 text-ink">Ask about this route</h2>
        <p className="text-body-s text-muted">
          Answers come only from the official pages for this route, with the exact words they quote.
        </p>
        <TextArea
          label="Your question"
          rows={2}
          maxLength={500}
          value={question}
          error={error ?? undefined}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <Button type="submit" loading={ask.isPending}>
          Ask
        </Button>
      </form>
      {data && (
        <section
          aria-live="polite"
          aria-labelledby="answer-heading"
          className="rounded-r-md border border-line p-5"
        >
          <h3 id="answer-heading" className="text-h4 text-ink">
            {data.question}
          </h3>
          {data.status === "answering" ? (
            <p className="mt-2 text-body text-muted">Reading the official pages…</p>
          ) : data.status === "not_in_sources" ? (
            <p className="mt-2 text-body text-ink">
              The official pages for this route don&apos;t answer that. Check with the embassy or a
              regulated adviser before you rely on anything else you read.
            </p>
          ) : data.status === "failed" ? (
            <InlineAlert
              tone="danger"
              title="We couldn't answer that just now. Try again in a minute."
            />
          ) : (
            <>
              <p className="mt-2 text-body text-ink whitespace-pre-line">{data.answer}</p>
              {data.partial && (
                <p className="mt-2 text-body-s text-warning">
                  Part of the answer couldn&apos;t be checked against the pages, so it was left out.
                </p>
              )}
              {citations.length > 0 && (
                <ul className="mt-4 space-y-3">
                  {citations.map((citation, index) => (
                    <li key={`${citation.url}-${index}`} className="rounded-r-sm bg-sunken p-3">
                      <blockquote className="flex gap-2 text-body-s text-ink">
                        <Quote aria-hidden className="mt-0.5 size-4 shrink-0 text-subtle" />
                        {citation.quote}
                      </blockquote>
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-caption text-accent underline underline-offset-3"
                      >
                        {citation.name}
                        <ExternalLink aria-hidden className="size-3" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                      {citation.page_changed && (
                        <span className="ml-2 text-caption text-warning">
                          The page has changed since.
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {disclaimer && <p className="mt-4 text-caption text-subtle">{disclaimer}</p>}
        </section>
      )}
    </div>
  );
}

function Changes({ code }: { code: string }) {
  const changes = useRuleChanges();
  const mine = (changes.data ?? []).filter((change) => change.route.code === code);
  if (changes.isPending) return <Skeleton className="h-24 w-full" />;
  if (!mine.length) {
    return <p className="text-body text-muted">Your result for this route hasn&apos;t changed.</p>;
  }
  return <ChangeList changes={mine} />;
}

/** Status moves, as DiffViews, newest first. */
export function ChangeList({
  changes,
  showRoute = false,
}: {
  changes: {
    id: string;
    route: { code: string; name: string };
    from_status: string;
    to_status: string;
    cause: string;
    created_at: string;
  }[];
  showRoute?: boolean;
}) {
  const pill = (status: string) =>
    STATUSES.has(status) ? (
      <StatusPill status={status as StatusKind} />
    ) : (
      <span>{status || "Not checked"}</span>
    );
  return (
    <ol className="space-y-3">
      {changes.map((change) => (
        <li key={change.id} className="rounded-r-md border border-line p-4">
          <p className="text-caption text-muted">
            {formatDate(change.created_at)} ·{" "}
            {change.cause === "rules" ? "A rule changed" : "Your profile changed"}
          </p>
          {showRoute && (
            <Link
              href={`/ai/routes/${change.route.code}`}
              className="mt-1 block font-semibold text-ink hover:underline hover:underline-offset-3"
            >
              {change.route.name}
            </Link>
          )}
          <div className="mt-2">
            <DiffView
              label="Result"
              before={pill(change.from_status)}
              after={pill(change.to_status)}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** /ai/routes/[routeId] (web.md §6.2). */
export function RouteView({ code }: { code: string }) {
  const detail = useEligibilityDetail(code);
  const route = useRouteDetail(code);
  const [tab, setTab] = useState<Tab>("requirements");

  if (route.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading the route" className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (route.isError) {
    return (
      <EmptyState icon={<CircleHelp />} title="We couldn't find that route">
        It may have been retired, or the link is wrong.{" "}
        <Link href="/ai/routes" className="text-accent underline underline-offset-3">
          See your routes
        </Link>
      </EmptyState>
    );
  }

  const info = route.data;
  const result = detail.data ?? null;
  const trace = result && Array.isArray(result.trace) ? (result.trace as TraceLine[]) : null;
  const gaps = result?.gaps ?? [];
  const openGaps = gaps.filter((gap) => gap.key !== "stale" && gap.key !== "rules_pending").length;
  const tabs = [
    { value: "requirements" as const, label: "Requirements" },
    { value: "gaps" as const, label: "Gaps", count: result ? openGaps : undefined },
    { value: "checklist" as const, label: "Checklist" },
    { value: "guide" as const, label: "Guide" },
    { value: "changes" as const, label: "Changes" },
  ];

  return (
    <>
      <Link
        href="/ai/routes"
        className="mb-4 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Your routes
      </Link>
      <header className="mb-6">
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="font-display text-h1 text-balance text-ink">{info.name}</h1>
          {result && STATUSES.has(result.status) && (
            <StatusPill status={result.status as StatusKind} className="mt-2" />
          )}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-3 text-body text-muted">
          {info.typical_months_to_arrival ? (
            <span>About {info.typical_months_to_arrival} months to arrive</span>
          ) : null}
          {info.leads_to_pr && (
            <span className="inline-flex items-center gap-1 text-accent">
              <FlagIcon aria-hidden className="size-4" /> Leads to permanent residence
            </span>
          )}
        </p>
        {!result && (
          <p className="mt-2 text-body-s text-muted">
            This route isn&apos;t in your destination, so we show its rules without your results.
          </p>
        )}
        {result?.uses_stale_rules && (
          <InlineAlert tone="warning" title="Uses a rule awaiting a re-check" className="mt-3">
            A source changed and a researcher is checking it. The result may move.
          </InlineAlert>
        )}
      </header>

      <Tabs
        id="route"
        label="Route details"
        tabs={tabs}
        value={tab}
        onChange={setTab}
        className="mb-6"
      />
      <TabPanel tabsId="route" value={tab}>
        {tab === "requirements" && (
          <Requirements
            trace={trace}
            rules={(info.requirements ?? []) as unknown as PublicRule[]}
          />
        )}
        {tab === "gaps" &&
          (result ? (
            <Gaps code={code} gaps={gaps} status={result.status} />
          ) : (
            <p className="text-body text-muted">
              Gaps are worked out for routes in your destination.
            </p>
          ))}
        {tab === "checklist" && <ChecklistTab code={code} />}
        {tab === "guide" && <Guide code={code} summary={info.summary} />}
        {tab === "changes" && <Changes code={code} />}
      </TabPanel>
    </>
  );
}
