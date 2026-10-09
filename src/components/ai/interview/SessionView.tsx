"use client";

/**
 * A practice session (web.md §11.6): one question at a time, answered by
 * voice or typing, scored on content, clarity, STAR structure (job and
 * admission interviews only) and pace, then the session's own summary.
 */

import { ArrowLeft, Mic, RotateCcw, Square } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  type Attempt,
  type InterviewKind,
  KIND_LABEL,
  type Session,
  useSession,
  useStartSession,
  useSubmitAnswer,
} from "@/lib/ai/coaching";
import { Button } from "../Button";
import { cx } from "../cx";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { TaskProgress } from "../evidence/Progress";
import { TextArea } from "../fields";
import { useSpeechRecorder } from "./useSpeechRecorder";

const STAR_LABEL = {
  situation: "Situation",
  task: "Task",
  action: "Action",
  result: "Result",
} as const;

function latestAttempt(session: Session, index: number): Attempt | null {
  const attempts = session.attempts.filter((a) => a.index === index);
  if (!attempts.length) return null;
  return attempts.reduce((best, a) => (a.number > best.number ? a : best));
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-body-s text-muted">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className={cx("size-2.5 rounded-full", i < value ? "bg-accent" : "bg-sunken")}
          />
        ))}
      </div>
      <span className="text-caption text-subtle">{value}/5</span>
    </div>
  );
}

function FeedbackCard({ attempt, kind }: { attempt: Attempt; kind: InterviewKind }) {
  if (attempt.status === "scoring") {
    return (
      <TaskProgress
        title="Scoring your answer"
        steps={[{ label: "Reading your answer", state: "active" }]}
      />
    );
  }
  if (attempt.status === "failed" || !attempt.scores) {
    return <InlineAlert tone="danger" title="We couldn't score that answer. Try again." />;
  }
  const { scores } = attempt;
  return (
    <div className="space-y-3 rounded-r-md border border-line p-4">
      <ScoreRow label="Content" value={scores.content} />
      <ScoreRow label="Clarity" value={scores.clarity} />
      <ScoreRow label="Pace" value={scores.pace} />
      {scores.structure !== undefined && <ScoreRow label="Structure" value={scores.structure} />}
      {scores.star && (kind === "job" || kind === "admission") && (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STAR_LABEL) as (keyof typeof STAR_LABEL)[]).map((part) => (
            <span
              key={part}
              className={cx(
                "rounded-full px-2 py-0.5 text-caption font-semibold",
                scores.star![part] ? "bg-success-bg text-success" : "bg-sunken text-muted",
              )}
            >
              {STAR_LABEL[part]}
            </span>
          ))}
        </div>
      )}
      {attempt.feedback && <p className="text-body text-ink">{attempt.feedback}</p>}
      {scores.improvements && scores.improvements.length > 0 && (
        <div>
          <p className="text-body-s font-semibold text-ink">Try next time</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-body-s text-ink">
            {scores.improvements.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AnswerControls({
  onSubmit,
  loading,
}: {
  onSubmit: (transcript: string, durationSeconds: number) => void;
  loading: boolean;
}) {
  const recorder = useSpeechRecorder();
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(!recorder.supported);

  function submitRecorded() {
    recorder.stop();
    onSubmit(recorder.transcript, recorder.durationSeconds());
  }

  if (typing) {
    return (
      <div className="space-y-3">
        <TextArea
          label="Your answer"
          hideLabel
          rows={5}
          placeholder="Type your answer…"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={typed.trim().split(/\s+/).length < 3}
            loading={loading}
            onClick={() => onSubmit(typed.trim(), Math.max(1, Math.round(typed.length / 12)))}
          >
            Submit answer
          </Button>
          {recorder.supported && (
            <Button variant="tertiary" onClick={() => setTyping(false)}>
              Speak instead
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recorder.status === "recording" ? (
        <Button
          variant="danger"
          icon={<Square aria-hidden className="size-4" />}
          onClick={submitRecorded}
          loading={loading}
        >
          Stop and submit
        </Button>
      ) : (
        <Button icon={<Mic aria-hidden className="size-4" />} onClick={recorder.start}>
          {recorder.status === "stopped" ? "Record again" : "Start speaking"}
        </Button>
      )}
      {recorder.status !== "idle" && (
        <p aria-live="polite" className="text-body-s text-muted">
          {recorder.transcript || "Listening…"}
        </p>
      )}
      {recorder.error && <InlineAlert tone="warning" title={recorder.error} />}
      <div>
        <Button variant="tertiary" size="sm" onClick={() => setTyping(true)}>
          Type instead
        </Button>
      </div>
    </div>
  );
}

function SessionSummary({ session, onRestart }: { session: Session; onRestart: () => void }) {
  if (!session.summary) return null;
  const { summary } = session;
  return (
    <div className="space-y-4 rounded-r-md border border-line bg-surface p-5">
      <p className="font-display text-h3 text-ink">
        Overall: <span className="text-accent">{summary.overall.toFixed(1)} / 5</span>
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.content !== undefined && (
          <ScoreRow label="Content" value={Math.round(summary.content)} />
        )}
        {summary.clarity !== undefined && (
          <ScoreRow label="Clarity" value={Math.round(summary.clarity)} />
        )}
        {summary.pace !== undefined && <ScoreRow label="Pace" value={Math.round(summary.pace)} />}
        {summary.structure !== undefined && (
          <ScoreRow label="Structure" value={Math.round(summary.structure)} />
        )}
      </div>
      <p className="text-body-s text-muted">
        Weakest answer: Question {summary.weakest_question + 1}
      </p>
      <Button icon={<RotateCcw aria-hidden className="size-4" />} onClick={onRestart}>
        Practise again
      </Button>
    </div>
  );
}

export function SessionView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const session = useSession(sessionId);
  const submit = useSubmitAnswer(sessionId);
  const start = useStartSession();
  const [index, setIndex] = useState(0);
  const [retrying, setRetrying] = useState<Set<number>>(new Set());

  if (session.isPending) return <Skeleton className="h-60" />;
  if (session.isError || !session.data) {
    return (
      <EmptyState icon={<Mic aria-hidden />} title="We couldn't find that session">
        It may have been removed.
      </EmptyState>
    );
  }
  const data = session.data;

  if (data.status === "preparing" || data.status === "failed") {
    return (
      <div className="space-y-6">
        <Link
          href="/ai/interview"
          className="inline-flex items-center gap-1.5 text-body-s text-muted hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" /> Interview practice
        </Link>
        <h1 className="font-display text-h2 text-ink">{data.job_title || KIND_LABEL[data.kind]}</h1>
        {data.status === "preparing" ? (
          <TaskProgress
            title="Writing your questions"
            steps={[{ label: "Reading what to ask you", state: "active" }]}
          />
        ) : (
          <InlineAlert tone="danger" title="We couldn't prepare this session">
            {data.error}
          </InlineAlert>
        )}
      </div>
    );
  }

  const current = data.questions[index] as { text: string; why_asked?: string } | undefined;
  const attempt = retrying.has(index) ? null : latestAttempt(data, index);
  const firstUnanswered = data.questions.findIndex(
    (_, i) => !latestAttempt(data, i) || latestAttempt(data, i)?.status === "failed",
  );

  function answer(transcript: string, durationSeconds: number) {
    setRetrying((current) => {
      const next = new Set(current);
      next.delete(index);
      return next;
    });
    submit.mutate({ index, transcript, durationSeconds });
  }

  function restart() {
    start.mutate(
      { kind: data.kind, job: data.job ?? undefined, route: data.route ?? undefined },
      { onSuccess: (fresh) => router.push(`/ai/interview/${fresh.id}`) },
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/ai/interview"
        className="inline-flex items-center gap-1.5 text-body-s text-muted hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" /> Interview practice
      </Link>

      <div>
        <h1 className="font-display text-h2 text-ink">{data.job_title || KIND_LABEL[data.kind]}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.questions.map((_, i) => {
            const a = latestAttempt(data, i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index ? "step" : undefined}
                className={cx(
                  "flex size-8 items-center justify-center rounded-full border text-caption font-semibold",
                  i === index
                    ? "border-accent bg-accent text-on-accent"
                    : a?.status === "scored"
                      ? "border-success-line bg-success-bg text-success"
                      : "border-line bg-surface text-muted",
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {data.status === "complete" && <SessionSummary session={data} onRestart={restart} />}

      {current && (
        <div className="space-y-4">
          <div className="rounded-r-md border border-line bg-surface p-5">
            <p className="text-h4 text-ink">{current.text}</p>
            {current.why_asked && (
              <p className="mt-1 text-body-s text-subtle">{current.why_asked}</p>
            )}
          </div>
          {attempt ? (
            <>
              <FeedbackCard attempt={attempt} kind={data.kind} />
              {attempt.status !== "scoring" && data.status !== "complete" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    icon={<RotateCcw aria-hidden className="size-4" />}
                    onClick={() => setRetrying((current) => new Set(current).add(index))}
                  >
                    Try this question again
                  </Button>
                  {index < data.questions.length - 1 && (
                    <Button onClick={() => setIndex(index + 1)}>Next question</Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <AnswerControls loading={submit.isPending} onSubmit={answer} />
          )}
        </div>
      )}
      {data.status !== "complete" &&
        firstUnanswered >= 0 &&
        firstUnanswered !== index &&
        !attempt && (
          <p className="text-caption text-subtle">
            Question {firstUnanswered + 1} still needs an answer.
          </p>
        )}
    </div>
  );
}
