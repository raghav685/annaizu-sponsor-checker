/**
 * Operational alerting, per the brief: alert if the source hasn't changed in
 * 7+ days, total row count moves more than ~2% in one publish, or the sync
 * errors twice consecutively. Always logged; also posted to ALERT_WEBHOOK_URL
 * if set (no email provider is configured in this environment).
 */
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { syncRuns } from "@/db/schema";

export interface Alert {
  code: "source_stale" | "row_count_swing" | "consecutive_failures";
  message: string;
  details: Record<string, unknown>;
}

const STALE_DAYS_THRESHOLD = 7;
const ROW_COUNT_SWING_THRESHOLD = 0.02;

export async function checkAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const recentRuns = await db.query.syncRuns.findMany({
    orderBy: [desc(syncRuns.startedAt)],
    limit: 10,
  });

  const lastSuccessfulOrNoChange = recentRuns.find((r) => r.status === "success" || r.status === "no_change");
  if (lastSuccessfulOrNoChange?.registerPublicUpdatedAt) {
    const daysSince = (Date.now() - new Date(lastSuccessfulOrNoChange.registerPublicUpdatedAt).getTime()) / 86_400_000;
    if (daysSince >= STALE_DAYS_THRESHOLD) {
      alerts.push({
        code: "source_stale",
        message: `Register has not changed in ${daysSince.toFixed(1)} days (last change: ${lastSuccessfulOrNoChange.registerPublicUpdatedAt}).`,
        details: { daysSince, registerPublicUpdatedAt: lastSuccessfulOrNoChange.registerPublicUpdatedAt },
      });
    }
  }

  const successfulRuns = recentRuns.filter((r) => r.status === "success" && r.rowCount != null);
  if (successfulRuns.length >= 2) {
    const [latest, previous] = successfulRuns;
    const swing = Math.abs((latest.rowCount! - previous.rowCount!) / previous.rowCount!);
    if (swing > ROW_COUNT_SWING_THRESHOLD) {
      alerts.push({
        code: "row_count_swing",
        message: `Raw CSV row count moved ${(swing * 100).toFixed(2)}% between publishes (${previous.rowCount} -> ${latest.rowCount}).`,
        details: { previousRowCount: previous.rowCount, latestRowCount: latest.rowCount, swing },
      });
    }
  }

  if (recentRuns.length >= 2 && recentRuns[0].status === "failed" && recentRuns[1].status === "failed") {
    alerts.push({
      code: "consecutive_failures",
      message: `The last two sync runs both failed (#${recentRuns[1].id}, #${recentRuns[0].id}).`,
      details: { runIds: [recentRuns[1].id, recentRuns[0].id] },
    });
  }

  for (const alert of alerts) {
    console.warn(`[alert:${alert.code}] ${alert.message}`);
  }

  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (webhookUrl && alerts.length > 0) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alerts, checkedAt: new Date().toISOString() }),
      });
    } catch (err) {
      console.error("[alert] Failed to post to ALERT_WEBHOOK_URL:", err);
    }
  }

  return alerts;
}
