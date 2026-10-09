"use client";

/**
 * The funds checker (web.md §11.4, web-build F12): choose a route, upload
 * bank statements, a result panel with a coverage bar, a balance chart
 * against the required amount, flagged deposits, and official guidance.
 */

import { CircleDollarSign, ExternalLink, Landmark } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { useEligibility } from "@/lib/ai/onboarding";
import {
  dailyBalances,
  type FundsCheck,
  type FundsCheckItem,
  useFundsCheck,
  useFundsChecks,
  useStartFundsCheck,
  useUploadStatement,
} from "@/lib/ai/funds";
import { Button } from "../Button";
import { type Check, CheckList } from "../evidence/Trust";
import { formatDate } from "../evidence/format";
import { TaskProgress } from "../evidence/Progress";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { Select } from "../Select";
import { type UploadItem, Uploader } from "../Uploader";
import { BalanceChart, CoverageBar } from "./BalanceChart";

const VERDICT: Record<
  NonNullable<FundsCheck["results"]>["verdict"],
  { tone: "success" | "danger" | "warning"; label: string }
> = {
  meets: { tone: "success", label: "Meets the rule" },
  falls_short: { tone: "danger", label: "Doesn't meet it yet" },
  cant_tell: { tone: "warning", label: "Can't tell from these statements" },
};

const CHECK_NAME: Record<FundsCheckItem["check"], string> = {
  coverage: "Days covered",
  lowest_balance: "Lowest balance held",
  large_deposits: "Large deposits",
  age: "How recent the statements are",
  account_holder: "Whose account it is",
};

function toChecks(items: FundsCheckItem[]): Check[] {
  return items.map((item) => ({
    name: CHECK_NAME[item.check],
    outcome: item.outcome === "unknown" ? "unknown" : item.outcome,
    evidence: item.detail,
  }));
}

function ResultPanel({ check }: { check: FundsCheck }) {
  if (check.status === "checking") {
    return (
      <TaskProgress
        title="Reading your statements"
        steps={[
          { label: "Reading your statements and comparing them with the rule", state: "active" },
        ]}
      />
    );
  }
  if (check.status === "failed" || !check.results) {
    return (
      <InlineAlert tone="danger" title="We couldn't read these statements">
        {check.error || "Try a clearer scan or a direct PDF export from your bank."}
      </InlineAlert>
    );
  }
  const { verdict, checks, currency } = check.results;
  const series = dailyBalances(check.extracted ?? []);
  const lowest = checks.find((item) => item.check === "lowest_balance");
  const coverage = checks.find((item) => item.check === "coverage");
  const deposits = checks.find((item) => item.check === "large_deposits")?.deposits ?? [];
  const threshold = lowest?.needed ? Number(lowest.needed) : undefined;
  const { tone, label } = VERDICT[verdict];

  return (
    <div className="space-y-6">
      <div
        className={
          tone === "success"
            ? "rounded-r-md border border-success-line bg-success-bg p-4 text-success"
            : tone === "danger"
              ? "rounded-r-md border border-danger-line bg-danger-bg p-4 text-danger"
              : "rounded-r-md border border-warning-line bg-warning-bg p-4 text-warning"
        }
      >
        <p className="font-display text-h4">{label}</p>
      </div>

      {series.length > 1 && (
        <section>
          <h2 className="text-h4 text-ink">Balance over the statement period</h2>
          <div className="mt-3 rounded-r-md border border-line p-4">
            <BalanceChart series={series} currency={currency || "NGN"} threshold={threshold} />
          </div>
        </section>
      )}

      {series.length > 0 && (
        <section>
          <h2 className="text-h4 text-ink">Days covered</h2>
          <div className="mt-3 rounded-r-md border border-line p-4">
            <CoverageBar series={series} neededDays={coverage?.needed} />
          </div>
        </section>
      )}

      <section>
        <h2 className="text-h4 text-ink">Every check</h2>
        <div className="mt-3 rounded-r-md border border-line">
          <CheckList checks={toChecks(checks)} />
        </div>
      </section>

      {deposits.length > 0 && (
        <section>
          <h2 className="text-h4 text-ink">Large deposits</h2>
          <p className="mt-1 text-body-s text-muted">
            Officers often ask where money like this came from. Keep evidence ready: salary slips, a
            sale receipt, or a signed gift letter.
          </p>
          <ul className="mt-3 divide-y divide-line rounded-r-md border border-line">
            {deposits.map((deposit, index) => (
              <li key={`${deposit.date}-${index}`} className="p-4">
                <p className="font-semibold text-ink">
                  {deposit.amount} {currency}
                </p>
                <p className="text-body-s text-muted">
                  {deposit.date && formatDate(deposit.date)}
                  {deposit.description && ` · ${deposit.description}`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {check.route && (
        <Link
          href={`/ai/visa/${check.route}`}
          className="inline-flex items-center gap-1.5 text-body-s font-semibold text-accent hover:underline"
        >
          Official guidance for this route
          <ExternalLink aria-hidden className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

export function FundsCheckerView() {
  const eligibility = useEligibility(true);
  const upload = useUploadStatement();
  const start = useStartFundsCheck();
  const checks = useFundsChecks();
  const [route, setRoute] = useState("");
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploaderId = useId();
  const active = useFundsCheck(activeCheckId);

  const routeOptions = [
    { value: "", label: "Any route" },
    ...(eligibility.data?.results ?? []).map((result) => ({
      value: result.route.code,
      label: `${result.route.name} (${result.route.country})`,
    })),
  ];

  function onFiles(files: File[]) {
    for (const file of files) {
      const id = crypto.randomUUID();
      setItems((current) => [
        ...current,
        {
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          status: "uploading",
          progress: undefined,
        },
      ]);
      upload.mutate(file, {
        onSuccess: (document) => {
          setDocumentIds((current) => [...current, document.id]);
          setItems((current) =>
            current.map((item) => (item.id === id ? { ...item, status: "done" as const } : item)),
          );
        },
        onError: () => {
          setItems((current) =>
            current.map((item) =>
              item.id === id
                ? { ...item, status: "failed" as const, note: "Couldn't upload." }
                : item,
            ),
          );
        },
      });
    }
  }

  function startCheck() {
    if (!documentIds.length) {
      setError("Upload at least one bank statement first.");
      return;
    }
    setError(null);
    start.mutate(
      { documents: documentIds, route: route || undefined },
      {
        onSuccess: (check) => setActiveCheckId(check.id),
        onError: () => setError("We couldn't start the check. Try again."),
      },
    );
  }

  const viewing = active.data ?? (activeCheckId === null ? null : undefined);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-h2 text-ink">Funds checker</h1>
        <p className="mt-1 text-body text-muted">
          Upload your bank statements and we&apos;ll compare them with your route&apos;s
          maintenance-funds rule, the same way an officer would: coverage, lowest balance, large
          deposits, how recent they are, and whose name is on the account.
        </p>
      </div>

      {!viewing && (
        <div className="space-y-4 rounded-r-md border border-line bg-surface p-5">
          <Select
            label="Route"
            helper="Optional, but needed to compare against an exact amount and period."
            options={routeOptions}
            value={route}
            onChange={(event) => setRoute(event.target.value)}
          />
          <Uploader
            label="Bank statements"
            hint="PDF or a clear photo, up to 6 statements."
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            maxBytes={15 * 1024 * 1024}
            items={items}
            onFiles={onFiles}
            onRemove={(id) => {
              setItems((current) => current.filter((item) => item.id !== id));
            }}
          />
          {error && <InlineAlert tone="danger" title={error} />}
          <Button
            icon={<CircleDollarSign aria-hidden className="size-4" />}
            loading={start.isPending}
            onClick={startCheck}
          >
            Check my funds
          </Button>
        </div>
      )}

      {activeCheckId && (
        <div>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => {
              setActiveCheckId(null);
              setItems([]);
              setDocumentIds([]);
            }}
          >
            Start a new check
          </Button>
          <div className="mt-3">
            {viewing === undefined ? (
              <Skeleton className="h-40" />
            ) : (
              viewing && <ResultPanel check={viewing} />
            )}
          </div>
        </div>
      )}

      {!activeCheckId && (
        <section>
          <h2 id={uploaderId} className="text-h4 text-ink">
            Past checks
          </h2>
          {checks.isPending ? (
            <Skeleton className="mt-3 h-24" />
          ) : !checks.data?.length ? (
            <EmptyState icon={<Landmark aria-hidden />} title="No checks yet">
              Run your first funds check above.
            </EmptyState>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-r-md border border-line">
              {checks.data.map((check) => (
                <li key={check.id}>
                  <button
                    type="button"
                    onClick={() => setActiveCheckId(check.id)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-sunken"
                  >
                    <span>
                      <span className="font-semibold text-ink">
                        {check.route ? check.route.toUpperCase() : "Any route"}
                      </span>
                      <span className="ml-2 text-body-s text-muted">
                        {formatDate(check.created_at)}
                      </span>
                    </span>
                    {check.status === "done" && check.results && (
                      <span className="text-body-s font-semibold text-ink">
                        {VERDICT[check.results.verdict].label}
                      </span>
                    )}
                    {check.status === "checking" && (
                      <span className="text-body-s text-muted">Checking…</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
