import { isSupabaseConfigured } from "../supabase";
import { cloudRepo } from "./cloud";
import { demoRepo } from "./demo";
import type { Repo } from "./types";

export type { Repo } from "./types";

const DEMO_FLAG = "mypet-modo";

/** Nuvem quando o Supabase está configurado e a pessoa não escolheu o modo demonstração. */
export function pickRepo(): Repo {
  if (!isSupabaseConfigured()) return demoRepo;
  try {
    if (localStorage.getItem(DEMO_FLAG) === "demo") return demoRepo;
  } catch {
    /* ignora */
  }
  return cloudRepo;
}

export function setDemoMode(on: boolean) {
  try {
    if (on) localStorage.setItem(DEMO_FLAG, "demo");
    else localStorage.removeItem(DEMO_FLAG);
  } catch {
    /* ignora */
  }
}

export { isSupabaseConfigured };
