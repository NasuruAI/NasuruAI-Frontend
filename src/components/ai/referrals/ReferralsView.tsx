"use client";

import { Check, Copy, Gift } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useReferrals, useRequestPayout } from "@/lib/ai/referrals";
import { Button } from "../Button";
import { Pill, type Tone } from "../Chip";
import { cx } from "../cx";
import { Dialog } from "../Dialog";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { TextField } from "../fields";
import { useToast } from "../Toast";

const REWARD_TONE: Record<string, Tone> = {
  pending: "info",
  approved: "info",
  paid: "success",
  void: "danger",
};
const REWARD_LABEL: Record<string, string> = {
  pending: "Under review",
  approved: "Approved",
  paid: "Paid",
  void: "Void",
};

const EVENT_LABEL: Record<string, string> = {
  signup: "signed up",
  paid: "activated their account",
  offer: "received an offer",
  enrolled: "enrolled",
};

function PayoutDialog({ onClose }: { onClose: () => void }) {
  const payout = useRequestPayout();
  const toast = useToast();
  const [form, setForm] = useState({ bank_name: "", account_number: "", account_name: "" });
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    payout.mutate(form, {
      onSuccess: () => {
        onClose();
        toast({ message: "Payout requested." });
      },
      onError: (err) =>
        setError(
          err instanceof ApiError
            ? (Object.values(err.fieldErrors)[0]?.[0] ?? err.message)
            : "We couldn't submit that request.",
        ),
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Payout details"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={payout.isPending} onClick={submit}>
            Request payout
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="space-y-4 pb-2"
      >
        {error && <InlineAlert tone="danger" title={error} />}
        <TextField
          label="Bank"
          required
          value={form.bank_name}
          onChange={(event) => setForm({ ...form, bank_name: event.target.value })}
        />
        <TextField
          label="Account number"
          required
          inputMode="numeric"
          pattern="\d{10}"
          helper="10 digits."
          value={form.account_number}
          onChange={(event) => setForm({ ...form, account_number: event.target.value })}
        />
        <TextField
          label="Account name"
          required
          value={form.account_name}
          onChange={(event) => setForm({ ...form, account_name: event.target.value })}
        />
      </form>
    </Dialog>
  );
}

/** /ai/referrals (plan §6.3): share a link, earn when a referral activates. */
export function ReferralsView() {
  const referrals = useReferrals();
  const [copied, setCopied] = useState(false);
  const [showPayout, setShowPayout] = useState(false);

  async function copy() {
    if (!referrals.data) return;
    try {
      await navigator.clipboard.writeText(referrals.data.summary.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied: the link is still right there to select.
    }
  }

  if (referrals.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading your referrals" className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (referrals.isError || !referrals.data) {
    return <InlineAlert tone="danger" title="We couldn't load your referral details." />;
  }

  const data = referrals.data;
  const balance = Number(data.summary.available_balance);

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <p className="text-overline text-muted uppercase">Referrals</p>
        <h1 className="mt-1 font-display text-h1 text-ink">Refer a friend</h1>
        <p className="mt-2 text-body text-muted">
          Share your link. You earn when someone you referred activates their account, not just when
          they sign up.
        </p>
      </header>

      <section className="rounded-r-md border border-line bg-surface p-5">
        <p className="text-overline text-muted uppercase">Your link</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <code className="min-w-0 flex-1 truncate rounded-r-sm bg-sunken px-3 py-2 text-body-s">
            {data.summary.share_url}
          </code>
          <Button
            variant="secondary"
            size="sm"
            icon={
              copied ? (
                <Check aria-hidden className="size-4" />
              ) : (
                <Copy aria-hidden className="size-4" />
              )
            }
            onClick={() => void copy()}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="mt-2 text-caption text-subtle">
          Code: <span className="font-mono">{data.summary.code}</span>
        </p>
      </section>

      <section className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: "Signed up", value: data.summary.signups },
          { label: "Activated", value: data.summary.conversions },
          { label: "Earned", value: `₦${Number(data.summary.total_earned).toLocaleString()}` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-r-md border border-line p-4">
            <p className="text-caption text-subtle">{stat.label}</p>
            <p className="mt-1 text-metric-s tabular-nums text-ink">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-r-md border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-body-s text-muted">Available to withdraw</p>
            <p className="text-metric text-ink">₦{balance.toLocaleString()}</p>
          </div>
          <Button onClick={() => setShowPayout(true)} disabled={balance <= 0}>
            Request payout
          </Button>
        </div>
        {balance <= 0 && (
          <p className="mt-2 text-caption text-subtle">
            Rewards become available once the referred student&apos;s payment is confirmed and the
            reward is approved.
          </p>
        )}
      </section>

      {showPayout && <PayoutDialog onClose={() => setShowPayout(false)} />}

      {data.rewards.length === 0 && data.events.length === 0 && (
        <div className="mt-8">
          <EmptyState icon={<Gift />} title="No activity yet">
            Share your link above, and anyone who activates through it shows up here.
          </EmptyState>
        </div>
      )}

      {data.rewards.length > 0 && (
        <section className="mt-8">
          <h2 className="text-h4 text-ink">Your rewards</h2>
          <ul className="mt-3 divide-y divide-line rounded-r-md border border-line">
            {data.rewards.map((reward) => (
              <li key={reward.id} className="flex items-center justify-between p-4 text-body-s">
                <div>
                  <p className="font-semibold text-ink">
                    ₦{Number(reward.amount).toLocaleString()}
                  </p>
                  <p className="text-caption text-subtle">
                    {new Date(reward.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Pill tone={REWARD_TONE[reward.status] ?? "neutral"}>
                  {REWARD_LABEL[reward.status] ?? reward.status}
                </Pill>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.events.length > 0 && (
        <section className="mt-8">
          <h2 className="text-h4 text-ink">Activity</h2>
          <ul className={cx("mt-3 space-y-2 text-body-s text-muted")}>
            {data.events.map((event) => (
              <li key={event.id} className="flex justify-between gap-4">
                <span>
                  {event.student_name} {EVENT_LABEL[event.event_type] ?? event.event_type}
                </span>
                <span className="shrink-0 text-caption text-subtle">
                  {new Date(event.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
