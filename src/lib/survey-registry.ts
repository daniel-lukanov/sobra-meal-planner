// Which survey this visitor has done. Matched by a random device id kept in this browser (never an IP address),
// and by account once logged in. The version makes a changed survey count as new.
import { praticoDb } from "@/integrations/pratico-db/client";

export const SURVEY = { id: "survey-1", version: 2 } as const;
const KEY = "pratico-device-id";

export function deviceId(): string {
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) { id = crypto.randomUUID(); window.localStorage.setItem(KEY, id); }
    return id;
  } catch { return crypto.randomUUID(); }
}

/** True when this device or the logged-in account already finished the current survey. A failed lookup counts as no match. */
export async function surveyDone(): Promise<boolean> {
  const { data, error } = await praticoDb.rpc("survey_check", { p_device: deviceId(), p_survey: SURVEY.id, p_version: SURVEY.version });
  return !error && data === true;
}

export async function surveyRegister(sessionId: string, status: "completed" | "self_reported_not_matched"): Promise<void> {
  await praticoDb.rpc("survey_register", { p_device: deviceId(), p_session: sessionId, p_status: status, p_survey: SURVEY.id, p_version: SURVEY.version });
}
