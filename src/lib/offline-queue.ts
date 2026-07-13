// Offline mutation queue — stores failed API mutations to replay when internet returns

import { apiPost, apiPut, apiDelete, NetworkDownError } from "./api";

const QUEUE_KEY = "pos_offline_queue";

export interface OfflineOp {
  id: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: Record<string, unknown>;
  queuedAt: string;
}

function loadQueue(): OfflineOp[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as OfflineOp[];
  } catch {
    return [];
  }
}

function saveQueue(ops: OfflineOp[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
}

export function enqueueOfflineOp(
  method: OfflineOp["method"],
  path: string,
  body?: Record<string, unknown>
): void {
  const ops = loadQueue();
  ops.push({ id: crypto.randomUUID(), method, path, body, queuedAt: new Date().toISOString() });
  saveQueue(ops);
}

export function getOfflineQueueLength(): number {
  return loadQueue().length;
}

export async function flushOfflineQueue(): Promise<{ flushed: number; failed: number }> {
  const ops = loadQueue();
  if (ops.length === 0) return { flushed: 0, failed: 0 };

  const remaining: OfflineOp[] = [];
  let flushed = 0;
  let failed = 0;

  for (const op of ops) {
    try {
      if (op.method === "DELETE") {
        await apiDelete(op.path);
      } else if (op.method === "PUT" || op.method === "PATCH") {
        await apiPut(op.path, op.body ?? {});
      } else {
        await apiPost(op.path, op.body ?? {});
      }
      flushed++;
    } catch (err) {
      if (err instanceof NetworkDownError) {
        // Still offline — keep in queue
        remaining.push(op);
        failed++;
      } else {
        // Server error (validation etc.) — discard to avoid infinite loop
        failed++;
      }
    }
  }

  saveQueue(remaining);
  return { flushed, failed };
}

// Auto-flush when the browser detects internet connectivity
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushOfflineQueue().catch(() => {/* silent */});
  });
}
