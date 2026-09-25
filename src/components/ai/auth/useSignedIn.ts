"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { AFTER_SIGN_IN, AFTER_SIGN_UP, type SignedIn } from "@/lib/ai/auth";
import { useSession } from "@/lib/auth/SessionProvider";
import { safeNext } from "@/lib/safe-next";

/** Where `?next=` points, if it is a Nasuru AI page; otherwise the plan. */
export function aiNext(search: string): string {
  const next = safeNext(new URLSearchParams(search).get("next"), AFTER_SIGN_IN);
  return next.startsWith("/ai/") ? next : AFTER_SIGN_IN;
}

function nextPath(): string {
  return aiNext(window.location.search);
}

/**
 * After a sign-in: load the session, then go on. A new account starts
 * onboarding; a returning one goes back where it was sent from.
 */
export function useSignedIn() {
  const router = useRouter();
  const { refresh } = useSession();
  return useCallback(
    async (result: SignedIn) => {
      await refresh();
      router.replace(result.created ? AFTER_SIGN_UP : nextPath());
    },
    [refresh, router],
  );
}

/**
 * A visitor already signed in when the page loads goes straight on. Checked
 * once: a sign-in on this page also sets the session, and `useSignedIn`
 * decides where that goes (a new account starts onboarding).
 */
export function useRedirectIfSignedIn() {
  const router = useRouter();
  const { session, loading } = useSession();
  const checked = useRef(false);
  useEffect(() => {
    if (loading || checked.current) return;
    checked.current = true;
    if (session) router.replace(nextPath());
  }, [loading, session, router]);
}
