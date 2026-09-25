"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { type CandidateDocument, type DocumentKind, onboardingKeys } from "@/lib/ai/onboarding";
import { shellKeys } from "@/lib/ai/shell";
import { uploadResumable } from "@/lib/ai/upload";
import type { UploadItem } from "../Uploader";

type Local = UploadItem & { kind: DocumentKind; file: File };

/**
 * Files on their way up, as Uploader rows. Once a file lands it drops out of
 * this list and shows as a document from the API instead.
 */
export function useUploads() {
  const client = useQueryClient();
  const [items, setItems] = useState<Local[]>([]);
  const controllers = useRef(new Map<string, AbortController>());

  useEffect(() => {
    const running = controllers.current;
    return () => running.forEach((controller) => controller.abort());
  }, []);

  const update = (id: string, patch: Partial<Local>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const run = useCallback(
    async (item: Local) => {
      const controller = new AbortController();
      controllers.current.set(item.id, controller);
      update(item.id, { status: "uploading", progress: 0, note: undefined });
      try {
        const document = await uploadResumable(item.file, item.kind, {
          signal: controller.signal,
          onProgress: ({ sent, total, paused }) =>
            update(item.id, {
              status: paused ? "paused" : "uploading",
              progress: Math.round((sent / total) * 100),
            }),
        });
        client.setQueryData<CandidateDocument[]>(onboardingKeys.documents, (documents = []) => [
          document,
          ...documents.filter((existing) => existing.id !== document.id),
        ]);
        void client.invalidateQueries({ queryKey: onboardingKeys.documents });
        void client.invalidateQueries({ queryKey: shellKeys.me });
        setItems((current) => current.filter((entry) => entry.id !== item.id));
      } catch (error) {
        if (controller.signal.aborted) return;
        update(item.id, {
          status: "failed",
          note:
            error instanceof ApiError
              ? error.message
              : "The upload stopped. Check your connection and try again.",
        });
      } finally {
        controllers.current.delete(item.id);
      }
    },
    [client],
  );

  const add = useCallback(
    (files: File[], kind: DocumentKind) => {
      const added = files.map<Local>((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        status: "uploading",
        progress: 0,
        kind,
        file,
      }));
      setItems((current) => [...current, ...added]);
      added.forEach((item) => void run(item));
    },
    [run],
  );

  const retry = useCallback(
    (id: string) => {
      const item = items.find((entry) => entry.id === id);
      if (item) void run(item);
    },
    [items, run],
  );

  const remove = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  return { items, add, retry, remove };
}
