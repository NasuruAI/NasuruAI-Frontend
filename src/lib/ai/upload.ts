"use client";

/**
 * Resumable uploads (apps/candidates/uploads.py): a 12 MB scan over a Lagos
 * mobile connection often drops halfway, so a file goes up in 1 MB chunks.
 *
 * 1. Open a session with the file's size and SHA-256.
 * 2. Send each missing chunk. Chunks are idempotent: a resend is ignored.
 * 3. On a drop, wait for the connection, ask which chunks arrived, send the rest.
 * 4. Complete: the server joins and checks the file, then starts reading it.
 *
 * The session id is remembered per file hash, so picking the same file again
 * after closing the tab carries on where it stopped (sessions live 24 hours).
 */

import { ApiError } from "@/lib/api";
import { ai, unwrap } from "./client";
import type { CandidateDocument, DocumentKind } from "./onboarding";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export type UploadProgress = { sent: number; total: number; paused: boolean };

export async function sha256Hex(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const sessionKey = (hash: string, kind: string) => `nasuru.ai.upload.${kind}.${hash}`;

function remember(key: string, id: string | null) {
  try {
    if (id) localStorage.setItem(key, id);
    else localStorage.removeItem(key);
  } catch {
    // Storage blocked: the upload still works, it just can't resume after a reload.
  }
}

function recall(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** A request that never reached the server: worth waiting and trying again. */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof ApiError && error.status >= 500);
}

function waitForConnection(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      clearTimeout(timer);
      window.removeEventListener("online", done);
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const abort = () => {
      clearTimeout(timer);
      window.removeEventListener("online", done);
      reject(new DOMException("Upload cancelled", "AbortError"));
    };
    // Back online, or 5 s whichever is first: `online` doesn't fire for every drop.
    const timer = setTimeout(done, navigator.onLine ? 5000 : 30_000);
    window.addEventListener("online", done);
    signal?.addEventListener("abort", abort);
  });
}

async function openOrResume(file: File, kind: DocumentKind, hash: string) {
  const key = sessionKey(hash, kind);
  const known = recall(key);
  if (known) {
    const { data, response } = await ai.GET("/api/ai/v1/me/uploads/{session_id}/", {
      params: { path: { session_id: known } },
    });
    if (response.ok && data && data.status !== "expired") return data;
    remember(key, null);
  }
  const session = await unwrap(
    ai.POST("/api/ai/v1/me/uploads/", {
      body: { kind, filename: file.name, size_bytes: file.size, sha256: hash },
    }),
  );
  remember(key, session.id);
  return session;
}

export async function uploadResumable(
  file: File,
  kind: DocumentKind,
  {
    onProgress,
    signal,
  }: { onProgress?: (progress: UploadProgress) => void; signal?: AbortSignal } = {},
): Promise<CandidateDocument> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(
      `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 15 MB.`,
      400,
      {},
      "upload_error",
    );
  }
  const hash = await sha256Hex(file);
  let sent = 0;
  for (;;) {
    signal?.throwIfAborted();
    try {
      const session = await openOrResume(file, kind, hash);
      if (session.status !== "complete") {
        const have = new Set(session.received);
        const report = () => {
          sent = Math.min(file.size, have.size * session.chunk_size);
          onProgress?.({ sent, total: file.size, paused: false });
        };
        report();
        for (let index = 0; index < session.total_chunks; index++) {
          if (have.has(index)) continue;
          signal?.throwIfAborted();
          const chunk = file.slice(index * session.chunk_size, (index + 1) * session.chunk_size);
          await unwrap(
            ai.PUT("/api/ai/v1/me/uploads/{session_id}/chunks/{index}/", {
              params: { path: { session_id: session.id, index } },
              body: chunk as unknown as string,
              bodySerializer: (body) => body as unknown as BodyInit,
              headers: { "Content-Type": "application/octet-stream" },
              signal,
            }),
          );
          have.add(index);
          report();
        }
      }
      const document = await unwrap(
        ai.POST("/api/ai/v1/me/uploads/{session_id}/complete/", {
          params: { path: { session_id: session.id } },
          signal,
        }),
      );
      remember(sessionKey(hash, kind), null);
      return document;
    } catch (error) {
      if (!isNetworkError(error)) {
        // Expired or corrupted sessions can't be resumed: forget them.
        if (error instanceof ApiError && error.code === "upload_error") {
          remember(sessionKey(hash, kind), null);
        }
        throw error;
      }
      onProgress?.({ sent, total: file.size, paused: true });
      await waitForConnection(signal);
    }
  }
}
