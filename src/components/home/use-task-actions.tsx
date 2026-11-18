"use client";

import { useCallback, useState } from "react";
import { fmtTimeShort } from "@/lib/dates";
import { nextAfter, type Occurrence } from "@/lib/schedule";
import type { CareRecord } from "@/lib/types";
import { toDateStr } from "@/lib/dates";
import type { ExpenseAsk } from "../gastos/ask-expense";
import { useApp } from "../app-provider";
import { useToast } from "../ui/toast";

export interface AlreadyDone {
  occ: Occurrence;
  byName: string;
  at: string;
  status: string;
}

/**
 * Ações de uma tarefa: Feito (com aviso se outro tutor já fez), pular, adiar, mudar horário, desfazer.
 * A tela só muda depois que o banco confirma.
 */
export function useTaskActions() {
  const { repo, reloadData } = useApp();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [already, setAlready] = useState<AlreadyDone | null>(null);
  const [editTime, setEditTime] = useState<CareRecord | null>(null);
  /** Banho/tosa com valor: perguntar se lança em Gastos */
  const [expenseAsk, setExpenseAsk] = useState<ExpenseAsk | null>(null);

  const undo = useCallback(
    async (recordId: string) => {
      try {
        await repo.undo(recordId);
        await reloadData();
        toast("Desfeito.");
      } catch (e) {
        toast((e as Error).message, { tone: "erro" });
      }
    },
    [repo, reloadData, toast],
  );

  const complete = useCallback(
    async (occ: Occurrence, force = false) => {
      setBusyId(occ.id);
      try {
        const now = new Date();
        const res = await repo.complete({
          care: occ.care,
          occurrence: occ.key,
          status: "feito",
          doneAt: now.toISOString(),
          next: nextAfter(occ.care, now),
          force,
        });
        if (!res.ok) {
          setAlready({ occ, byName: res.already.byName, at: res.already.at, status: res.already.status });
          await reloadData();
          return;
        }
        await reloadData();
        const record = res.record;
        repo.notifyDone(record.id).catch(() => {}); // avisa os outros tutores
        if (occ.care.type === "banho" && occ.care.price) {
          setExpenseAsk({ amount: occ.care.price, category: "banho", note: occ.care.title === "Banho e tosa" ? occ.care.detail : [occ.care.title, occ.care.detail].filter(Boolean).join(" · "), date: toDateStr(now) });
        }
        toast(`Feito às ${fmtTimeShort(record.doneAt ?? now)} ✓`, {
          actions: [
            { label: "Mudar horário", onClick: () => setEditTime(record) },
            { label: "Desfazer", onClick: () => undo(record.id) },
          ],
        });
      } catch (e) {
        toast((e as Error).message, { tone: "erro" });
      } finally {
        setBusyId(null);
      }
    },
    [repo, reloadData, toast, undo],
  );

  const skip = useCallback(
    async (occ: Occurrence, reason: string) => {
      setBusyId(occ.id);
      try {
        const res = await repo.complete({
          care: occ.care,
          occurrence: occ.key,
          status: "pulado",
          reason: reason.trim() || undefined,
          next: nextAfter(occ.care, new Date(occ.key)),
        });
        await reloadData();
        if (!res.ok) {
          toast(`${res.already.byName} já ${res.already.status === "pulado" ? "pulou" : "fez"} esta tarefa.`);
          return;
        }
        const id = res.record.id;
        toast("Tarefa pulada.", { actions: [{ label: "Desfazer", onClick: () => undo(id) }] });
      } catch (e) {
        toast((e as Error).message, { tone: "erro" });
      } finally {
        setBusyId(null);
      }
    },
    [repo, reloadData, toast, undo],
  );

  const snooze = useCallback(
    async (occ: Occurrence, until: Date) => {
      setBusyId(occ.id);
      try {
        await repo.snooze(occ.care, occ.key, until.toISOString());
        await reloadData();
        toast(`Adiado para ${fmtTimeShort(until)}${until.getDate() !== new Date().getDate() ? " de amanhã" : ""}.`);
      } catch (e) {
        toast((e as Error).message, { tone: "erro" });
      } finally {
        setBusyId(null);
      }
    },
    [repo, reloadData, toast],
  );

  const saveTime = useCallback(
    async (record: CareRecord, at: Date) => {
      try {
        await repo.updateRecordTime(record.id, at.toISOString());
        await reloadData();
        setEditTime(null);
        toast(`Horário corrigido: ${fmtTimeShort(at)} ✓`);
      } catch (e) {
        toast((e as Error).message, { tone: "erro" });
      }
    },
    [repo, reloadData, toast],
  );

  return { busyId, complete, skip, snooze, undo, already, setAlready, editTime, setEditTime, saveTime, expenseAsk, setExpenseAsk };
}
