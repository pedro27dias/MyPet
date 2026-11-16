"use client";

import { motion } from "motion/react";
import { Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Repo } from "@/lib/repo";
import { isSupabaseConfigured, setDemoMode } from "@/lib/repo";
import { LogoMark } from "../shell/logo-mark";
import { Button } from "../ui/button";

/** Entrar / criar conta (e-mail e senha ou Google) + modo demonstração. */
export function LogoGoogle() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function LoginScreen({ repo, onModeChange }: { repo: Repo; onModeChange: () => void }) {
  const cloud = isSupabaseConfigured();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "entrar") await repo.signIn(email, password);
      else if (await repo.signUp(name, email, password)) setCheckEmail(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    try {
      await repo.signInWithGoogle();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function demo() {
    setDemoMode(true);
    onModeChange();
  }

  function leaveDemo() {
    setDemoMode(false);
    onModeChange();
  }

  if (checkEmail) {
    return (
      <Center>
        <div className="grid size-20 place-items-center rounded-full bg-primary-soft text-primary">
          <Mail size={36} />
        </div>
        <h1 className="mt-6 titulo text-3xl">Confira seu e-mail</h1>
        <p className="mt-2 text-muted">
          Mandamos um link para <b className="text-fg">{email}</b>. Toque nele para ativar sua conta e voltar para o app.
        </p>
        <Button variant="ghost" className="mt-6" onClick={() => (setCheckEmail(false), setMode("entrar"))}>
          Já confirmei, quero entrar
        </Button>
      </Center>
    );
  }

  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="flex justify-center">
          <LogoMark size={96} />
        </div>
        <h1 className="mt-4 titulo text-5xl">MyPet</h1>
        <p className="mt-1 text-muted">O que fazer e quando, sem precisar lembrar.</p>
      </motion.div>

      {cloud && repo.mode === "nuvem" ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-8">
          <Button variant="outline" size="lg" className="w-full" onClick={google}>
            <LogoGoogle /> Continuar com Google
          </Button>
          <div className="my-5 flex items-center gap-3 text-sm text-faint">
            <span className="h-px flex-1 bg-line" /> ou com e-mail <span className="h-px flex-1 bg-line" />
          </div>
          <form onSubmit={submit} className="space-y-3">
            {mode === "criar" && (
              <Field label="Seu nome" value={name} onChange={setName} autoComplete="name" required />
            )}
            <Field label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" required />
            <Field
              label="Senha"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === "entrar" ? "current-password" : "new-password"}
              required
              minLength={6}
            />
            {error && <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Aguarde..." : mode === "entrar" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          <p className="mt-5 text-center text-muted">
            {mode === "entrar" ? "Primeira vez aqui? " : "Já tem conta? "}
            <button type="button" className="font-bold text-primary" onClick={() => (setMode(mode === "entrar" ? "criar" : "entrar"), setError(null))}>
              {mode === "entrar" ? "Criar conta" : "Entrar"}
            </button>
          </p>
          <button type="button" onClick={demo} className="mt-8 w-full text-center text-sm text-faint underline-offset-4 hover:underline">
            Só quero testar (modo demonstração)
          </button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-8 space-y-4">
          <div className="rounded-3xl bg-peach-soft p-4 text-sm">
            <b>Modo demonstração.</b> Os dados ficam só neste aparelho e não são compartilhados.
            {!cloud && " (O banco de dados ainda não foi ligado.)"}
          </div>
          <Button size="lg" className="w-full" onClick={() => repo.signIn("", "")}>
            Começar
          </Button>
          {cloud && (
            <Button variant="ghost" className="w-full" onClick={leaveDemo}>
              Voltar para entrar com conta
            </Button>
          )}
        </motion.div>
      )}
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">{children}</main>;
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="mb-1 block px-1 text-sm font-bold text-muted">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-13 w-full rounded-2xl border-2 border-line bg-card px-4 outline-none transition focus:border-primary"
      />
    </label>
  );
}
