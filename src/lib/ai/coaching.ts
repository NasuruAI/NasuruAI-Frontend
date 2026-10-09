"use client";

/**
 * Interview practice (web.md §11.6, web-build F13): choose a job, route or
 * interview type, answer each question by voice or typing, and see where
 * you're strong and where to work.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ai, unwrap } from "./client";
import type { components } from "./schema";

type Schemas = components["schemas"];
export type InterviewKind = Schemas["InterviewKindEnum"];
export type SessionStatus = Schemas["CoachingSessionStatusEnum"];
export type AttemptStatus = Schemas["CoachingAttemptStatusEnum"];

export const INTERVIEW_KINDS: InterviewKind[] = ["job", "visa", "admission", "credibility"];

export const KIND_LABEL: Record<InterviewKind, string> = {
  job: "Job interview",
  visa: "Visa interview",
  admission: "University admission interview",
  credibility: "UK credibility interview",
};

export const KIND_BLURB: Record<InterviewKind, string> = {
  job: "Practise for a specific role: 8 questions written from its own posting.",
  visa: "Practise the questions a visa officer is likely to ask.",
  admission: "Practise for a university admissions interview.",
  credibility: "Practise the UK's genuine-student credibility interview.",
};

export type Question = { text: string; why_asked?: string; type?: string };

export type Star = { situation: boolean; task: boolean; action: boolean; result: boolean };

export type AttemptScores = {
  content: number;
  clarity: number;
  pace: number;
  words_per_minute: number;
  structure?: number;
  star?: Star;
  overall: number;
  improvements?: string[];
};

export type Attempt = Omit<Schemas["CoachingAttempt"], "scores" | "number"> & {
  number: number;
  scores: AttemptScores | null;
};

export type SessionSummary = {
  content?: number;
  clarity?: number;
  pace?: number;
  structure?: number;
  overall: number;
  weakest_question: number;
};

export type Session = Omit<
  Schemas["CoachingSession"],
  "questions" | "summary" | "attempts" | "route"
> & {
  questions: Question[];
  summary: SessionSummary | null;
  attempts: Attempt[];
  route: string | null;
};

export const coachingKeys = {
  sessions: ["ai", "coaching", "sessions"] as const,
  session: (id: string) => ["ai", "coaching", "session", id] as const,
};

/**
 * `summary` and each attempt's `scores` are JSONFields that default to `{}`,
 * not null — truthy but empty until there's a real result. Normalise to null
 * here so every consumer can keep using a plain truthy check.
 */
function normalize(session: Session): Session {
  return {
    ...session,
    summary: session.summary && "overall" in session.summary ? session.summary : null,
    attempts: session.attempts.map((attempt) => ({
      ...attempt,
      scores: attempt.scores && "overall" in attempt.scores ? attempt.scores : null,
    })),
  };
}

export function useSessions() {
  return useQuery({
    queryKey: coachingKeys.sessions,
    queryFn: async () =>
      ((await unwrap(ai.GET("/api/ai/v1/me/coaching/sessions/"))) as unknown as Session[]).map(
        normalize,
      ),
  });
}

/** Polled while questions are being written, or any answer is still being scored. */
export function useSession(id: string | null) {
  const client = useQueryClient();
  return useQuery({
    queryKey: coachingKeys.session(id ?? ""),
    queryFn: async () => {
      const session = normalize(
        (await unwrap(
          ai.GET("/api/ai/v1/me/coaching/sessions/{session_id}/", {
            params: { path: { session_id: id! } },
          }),
        )) as unknown as Session,
      );
      if (session.status === "complete")
        void client.invalidateQueries({ queryKey: coachingKeys.sessions });
      return session;
    },
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      if (data.status === "preparing") return 2000;
      if (data.attempts.some((a) => a.status === "scoring")) return 2000;
      return false;
    },
  });
}

export function useStartSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, job, route }: { kind: InterviewKind; job?: string; route?: string }) =>
      unwrap(
        ai.POST("/api/ai/v1/me/coaching/sessions/", {
          body: { kind, job: job ?? null, route: route ?? "" },
          headers: { "Idempotency-Key": crypto.randomUUID() },
        }),
      ) as unknown as Promise<Session>,
    onSuccess: () => void client.invalidateQueries({ queryKey: coachingKeys.sessions }),
  });
}

export function useSubmitAnswer(sessionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      index,
      transcript,
      durationSeconds,
    }: {
      index: number;
      transcript: string;
      durationSeconds: number;
    }) =>
      unwrap(
        ai.POST("/api/ai/v1/me/coaching/sessions/{session_id}/answers/", {
          params: { path: { session_id: sessionId } },
          body: { index, transcript, duration_seconds: durationSeconds },
        }),
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: coachingKeys.session(sessionId) }),
  });
}
