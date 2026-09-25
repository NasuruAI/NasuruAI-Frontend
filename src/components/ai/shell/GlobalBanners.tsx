"use client";

/**
 * Global banners under the top bar (web.md §1.3), at most two at a time, in
 * priority order: offline, payment issue, rule changed, stale data, email
 * unverified. Lower priorities wait.
 *
 * Built today: offline, rule changed, email unverified. Payment issue and
 * stale data need backend signals not yet exposed (web build checklist,
 * "Backend gaps").
 */

import { useState, useSyncExternalStore } from "react";
import { authFetch } from "@/lib/auth/client";
import { useSession } from "@/lib/auth/SessionProvider";
import { type RuleChange, useOnline, useRuleChanges } from "@/lib/ai/shell";
import { Button, ButtonLink } from "../Button";
import { Banner } from "../feedback";

const SEEN_KEY = "nasuru.ai.changes-seen";
const RECENT_DAYS = 7;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode: the banner simply comes back next visit.
  }
}

/** The newest rule change from the last week the person hasn't dismissed. */
export function unseenChange(
  changes: RuleChange[] | undefined,
  seenId: string | null,
  now = Date.now(),
): RuleChange | null {
  const newest = changes?.[0];
  if (!newest || newest.id === seenId) return null;
  const age = now - new Date(newest.created_at).getTime();
  return age <= RECENT_DAYS * 24 * 60 * 60 * 1000 ? newest : null;
}

function useOfflineSince(online: boolean): string | null {
  // The moment the connection dropped, captured once per outage.
  const [since, setSince] = useState<string | null>(null);
  const [wasOnline, setWasOnline] = useState(online);
  if (online !== wasOnline) {
    setWasOnline(online);
    setSince(
      online
        ? null
        : new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    );
  }
  return online ? null : (since ?? "a moment ago");
}

const noop = () => () => {};

export function GlobalBanners() {
  const online = useOnline();
  const offlineSince = useOfflineSince(online);
  const { session } = useSession();
  const { data: changes } = useRuleChanges();
  const storedSeen = useSyncExternalStore(
    noop,
    () => read(SEEN_KEY),
    () => null,
  );
  const [seen, setSeen] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const change = unseenChange(changes, seen ?? storedSeen);

  const banners: React.ReactNode[] = [];

  if (!online) {
    banners.push(
      <Banner key="offline" tone="warning">
        You&apos;re offline. Showing what you saw at {offlineSince}.
      </Banner>,
    );
  }

  if (change) {
    banners.push(
      <Banner
        key="rule-change"
        tone="info"
        action={
          <ButtonLink href="/ai/changes/mine" size="sm" variant="secondary">
            See what changed
          </ButtonLink>
        }
        onDismiss={() => {
          write(SEEN_KEY, change.id);
          setSeen(change.id);
        }}
      >
        A rule change affected your {change.route.name} result.
      </Banner>,
    );
  }

  const user = session?.user;
  if (user?.email && !user.email_verified_at) {
    banners.push(
      <Banner
        key="email"
        tone="info"
        action={
          resent ? (
            <span className="text-body-s text-muted">Sent. Check your inbox.</span>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void authFetch("/api/auth/resend-verification/", { method: "POST" }).then(() =>
                  setResent(true),
                );
              }}
            >
              Resend
            </Button>
          )
        }
      >
        Confirm your email address so we can reach you about deadlines.
      </Banner>,
    );
  }

  if (banners.length === 0) return null;
  return <div>{banners.slice(0, 2)}</div>;
}
