"use client";

/**
 * Refer a friend (plan §6.3): the agency's referral programme, moved under
 * the AI shell's own nav rather than the old product's separate one. Same
 * backend (`/api/referrals/*`) the old `/referrals` page already used.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReferralSummary } from "@/types";
import { ai, unwrap } from "./client";

export type ReferralEvent = {
  id: string;
  event_type: string;
  student_name: string;
  is_flagged: boolean;
  created_at: string;
};

export type ReferralReward = {
  id: string;
  amount: string;
  currency: string;
  status: string;
  trigger: string;
  created_at: string;
};

export type ReferralPayoutRequest = {
  id: string;
  amount: string;
  status: string;
  requested_at: string;
};

export type ReferralData = {
  summary: ReferralSummary & { total_paid_out: string };
  events: ReferralEvent[];
  rewards: ReferralReward[];
  payouts: ReferralPayoutRequest[];
};

const referralsKey = ["ai", "referrals"] as const;

/** The endpoint's response isn't in the generated schema (untyped on the
 * backend side), so it's cast to the hand-verified `@/types` contract the
 * old page already relied on. */
export function useReferrals() {
  return useQuery({
    queryKey: referralsKey,
    queryFn: async () => (await unwrap(ai.GET("/api/referrals/mine/"))) as unknown as ReferralData,
  });
}

export function useRequestPayout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { bank_name: string; account_number: string; account_name: string }) =>
      unwrap(ai.POST("/api/referrals/payout/", { body })),
    onSuccess: () => void client.invalidateQueries({ queryKey: referralsKey }),
  });
}
