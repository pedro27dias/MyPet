"use client";

import { useState } from "react";
import { blankCare } from "@/lib/onboarding";
import { atTime, fmtTime, toDateStr, todayStr } from "@/lib/dates";
import { isAnchored } from "@/lib/schedule";
import { FLEA_CAT_NOTE } from "@/lib/onboarding";
import type { Care, CareType, Freq, Species } from "@/lib/types";
import { useApp } from "../app-provider";
import { Button } from "../ui/button";
import { Pills, Stepper, TextField, TimeList } from "../ui/fields";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";
import { MED_FREQS } from "../onboarding/steps";
import { CARE_META, CareIcon } from "./care-meta";
import { FleaSafetyNote } from "./flea-safety";

/*
 * Formulário de um cuidado (novo ou editar). Remédio usa horários fixos; os outros usam uma data
 * (e, se quiser, repetem a cada X meses/anos contando da última vez feita).
 */

const DEFAULT_TITLE: Record<CareType, string> = {
  remedio: "",
  vacina: "Vacina V8/V10",
  vermifugo: "Vermífugo",
  antipulgas: "Antipulgas",
  consulta: "Consulta",
  exame: "Teste FeLV/FIV",
  outro: "",
};

const REPEAT_OPTIONS: { value: string; label: string }[] = [
  { value: "unica:1", label: "Não repete" },
  { value: "diaria:1", label: "Todo dia" },
  { value: "semanal:1", label: "Toda semana" },
  { value: "meses:1", label: "Todo mês" },
  { value: "meses:3", label: "A cada 3 meses" },
  { value: "meses:6", label: "A cada 6 meses" },
  { value: "anos:1", label: "Todo ano" },
];

const CONSULT_KINDS = ["Consulta", "Cirurgia", "Exame", "Banho e tosa"];

export function newCareFor(petId: string, type: CareType, species?: Species): Care {
  const cat = species === "gato";
  const c = blankCare(petId, type, cat && type === "vacina" ? "Vacina polivalente" : DEFAULT_TITLE[type]);
  if (cat && type === "antipulgas") c.note = FLEA_CAT_NOTE;
  if (type === "remedio") {
    c.freq = "diaria";
    c.times = ["08:00"];
    c.nextAt = null;
  }
  if (type === "vermifugo") Object.assign(c, { freq: "meses", interval: 3 });
  if (type === "antipulgas") Object.assign(c, { freq: "meses", interval: 1 });
  if (type === "vacina") Object.assign(c, { freq: "anos", interval: 1 });
  if (type === "consulta") c.notifyBeforeMin = 1440;
  if (c.nextAt && new Date(c.nextAt) < new Date()) {
    // 9h de hoje já passou: sugere a próxima hora cheia (ou amanhã às 9h, se já for noite)
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    if (d.getHours() >= 22 || d.getHours() < 7) {
      d.setDate(d.getDate() + (d.getHours() < 7 ? 0 : 1));
      d.setHours(9);
    }
    c.nextAt = d.toISOString();
    c.times = [fmtTime(d)];
  }
  return c;
}

export function CareFormSheet({ care, open, onClose }: { care: Care | null; open: boolean; onClose: () => void }) {
  return (
    <Sheet
      open={open && !!care}
      onClose={onClose}
      title={
        care && (
          <span className="flex items-center gap-3">
            <CareIcon type={care.type} size={36} />
            {CARE_META[care.type].label}
          </span>
        )
      }
    >
      {care && <CareForm key={care.id} initial={care} onDone={onClose} />}
    </Sheet>
  );
}

function CareForm({ initial, onDone }: { initial: Care; onDone: () => void }) {
  const { repo, cares, reloadData, pets } = useApp();
  const toast = useToast();
  const species = pets.find((p) => p.id === initial.petId)?.species ?? "cachorro";
  const isNew = !cares.some((c) => c.id === initial.id);
  const [c, setC] = useState<Care>(initial);
  const [date, setDate] = useState(initial.nextAt ? toDateStr(new Date(initial.nextAt)) : initial.start || todayStr());
  const [time, setTime] = useState(initial.nextAt ? fmtTime(new Date(initial.nextAt)) : initial.times[0] ?? "09:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<Care>) => setC((prev) => ({ ...prev, ...patch }));
  const med = c.type === "remedio";
  const anchored = isAnchored(c);

  async function save(active = true) {
    if (!c.title.trim()) {
      setError(med ? "Coloque o nome do remédio." : "Coloque um nome.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const out: Care = { ...c, title: c.title.trim(), detail: c.detail?.trim() || null, note: c.note?.trim() || null, active };
      if (isAnchored(out)) {
        if (!med) {
          // lembrete livre "todo dia"/"toda semana": começa na data escolhida, no horário escolhido
          out.times = [time];
          out.start = date;
        }
        out.nextAt = null;
        if (!out.times.length) out.times = ["08:00"];
      } else {
        out.times = [time];
        out.nextAt = atTime(date, time).toISOString();
        out.start = out.start || todayStr();
      }
      await repo.saveCare(out);
      await reloadData();
      toast(!active ? "Lembrete parado." : isNew ? "Lembrete criado ✓" : "Alterações salvas ✓");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-2">
      {c.type === "consulta" && (
        <div>
          <span className="mb-2 block px-1 text-sm font-bold text-muted">Tipo</span>
          <Pills
            options={CONSULT_KINDS.map((k) => ({ value: k, label: k }))}
            value={CONSULT_KINDS.includes(c.title) ? c.title : null}
            onChange={(v) => set({ title: v })}
          />
        </div>
      )}
      <TextField
        label={med ? "Nome do remédio" : c.type === "consulta" ? "Descrição" : "Nome"}
        value={c.title}
        onChange={(v) => set({ title: v })}
        placeholder={med ? "Ex.: Apoquel" : c.type === "outro" ? "Ex.: Cortar as unhas" : ""}
        autoFocus={isNew && !c.title}
      />
      {c.type === "antipulgas" && <FleaSafetyNote species={species} />}
      {c.type !== "outro" && (
        <TextField
          label={med ? "Dose" : c.type === "consulta" ? "Local" : "Produto (opcional)"}
          value={c.detail ?? ""}
          onChange={(v) => set({ detail: v })}
          placeholder={med ? "Ex.: 1 comprimido" : c.type === "consulta" ? "Ex.: Clínica Patas" : ""}
        />
      )}

      {med ? (
        <>
          <div>
            <span className="mb-2 block px-1 text-sm font-bold text-muted">Frequência</span>
            <Pills
              options={MED_FREQS}
              value={c.freq}
              onChange={(v: Freq) => set({ freq: v, times: v === "horas" ? c.times.slice(0, 1) : c.times })}
            />
          </div>
          {(c.freq === "horas" || c.freq === "dias") && (
            <Stepper
              label={c.freq === "horas" ? "horas" : "dias"}
              value={c.interval}
              min={1}
              max={c.freq === "horas" ? 24 : 60}
              onChange={(v) => set({ interval: v })}
            />
          )}
          {anchored ? (
            <>
              <div>
                <span className="mb-2 block px-1 text-sm font-bold text-muted">{c.freq === "horas" ? "Primeiro horário" : "Horário(s)"}</span>
                <TimeList
                  times={c.freq === "horas" ? c.times.slice(0, 1) : c.times}
                  onChange={(t) => set({ times: c.freq === "horas" ? t.slice(0, 1) : t })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Começa em" type="date" value={c.start} onChange={(v) => set({ start: v })} />
                <TextField label="Termina em" type="date" value={c.end ?? ""} onChange={(v) => set({ end: v || null })} />
              </div>
              <p className="-mt-2 px-1 text-sm text-muted">Sem data de fim = uso contínuo.</p>
            </>
          ) : (
            <DateTime date={date} time={time} onDate={setDate} onTime={setTime} />
          )}
        </>
      ) : (
        <>
          <DateTime date={date} time={time} onDate={setDate} onTime={setTime} label={c.type === "consulta" ? "Quando" : "Próxima vez"} />
          {c.type === "consulta" ? (
            <div>
              <span className="mb-2 block px-1 text-sm font-bold text-muted">Lembrar antes</span>
              <Pills
                options={[
                  { value: "1440", label: "1 dia antes" },
                  { value: "120", label: "2 horas antes" },
                  { value: "0", label: "Só na hora" },
                ]}
                value={String(c.notifyBeforeMin ?? 0)}
                onChange={(v) => set({ notifyBeforeMin: Number(v) || null })}
              />
            </div>
          ) : (
            <label className="block">
              <span className="mb-1 block px-1 text-sm font-bold text-muted">Repetir</span>
              <select
                value={`${c.freq}:${c.interval}`}
                onChange={(e) => {
                  const [f, n] = e.target.value.split(":");
                  set({ freq: f as Freq, interval: Number(n), start: date });
                }}
                className="h-13 w-full rounded-2xl border-2 border-line bg-card px-4 font-bold outline-none focus:border-primary"
              >
                {!REPEAT_OPTIONS.some((o) => o.value === `${c.freq}:${c.interval}`) && (
                  <option value={`${c.freq}:${c.interval}`}>
                    A cada {c.interval} {c.freq}
                  </option>
                )}
                {REPEAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {(c.freq === "meses" || c.freq === "anos") && (
                <span className="mt-1 block px-1 text-sm text-muted">A próxima conta a partir do dia em que for feito.</span>
              )}
            </label>
          )}
        </>
      )}

      <TextField label="Observação (opcional)" multiline value={c.note ?? ""} onChange={(v) => set({ note: v })} />

      {error && <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      <Button size="lg" className="w-full" disabled={busy} onClick={() => save(true)}>
        {busy ? "Salvando..." : isNew ? "Criar lembrete" : "Salvar"}
      </Button>
      {!isNew && c.active && (
        <Button variant="ghost" className="w-full" disabled={busy} onClick={() => save(false)}>
          Parar este lembrete
        </Button>
      )}
    </div>
  );
}

function DateTime({
  date,
  time,
  onDate,
  onTime,
  label = "Quando",
}: {
  date: string;
  time: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3">
      <TextField label={label} type="date" value={date} onChange={(v) => v && onDate(v)} />
      <TextField label="Hora" type="time" value={time} onChange={(v) => v && onTime(v)} />
    </div>
  );
}
