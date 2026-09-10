'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Button, Input, Field, cn } from '../components/ui';
import { getApiError } from '../lib/helpers';

function TypeWriter({ words, className }: { words: string[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[index % words.length] ?? '';

    if (!deleting && text === current) {
      const timer = setTimeout(() => setDeleting(true), 1800);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(
      () => {
        if (deleting && text === '') {
          setDeleting(false);
          setIndex((i) => (i + 1) % words.length);
        } else {
          setText(current.slice(0, text.length + (deleting ? -1 : 1)));
        }
      },
      deleting ? 40 : 90
    );
    return () => clearTimeout(timer);
  }, [text, deleting, index, words]);

  return (
    <span className={className}>
      {text}
      <span className="ml-1 inline-block h-[0.95em] w-[2px] animate-pulse rounded-full bg-current align-text-bottom" />
    </span>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { t, lang, toggleLang } = useUI();
  const router = useRouter();

  const redirectAfterLogin = () => {
    const from = new URLSearchParams(window.location.search).get('from');
    router.push(from && from.startsWith('/') ? from : '/dashboard');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      redirectAfterLogin();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-base">
      <div className="fixed right-4 top-4 z-20 flex items-center overflow-hidden rounded-[6px] border border-line bg-surface shadow-lg" role="group" aria-label={t.topbar.language}>
        {(['id', 'en'] as const).map((l) => (
          <button
            key={l}
            onClick={() => toggleLang()}
            className={cn(
              'px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide leading-none transition-opacity duration-150',
              lang === l ? 'text-ink opacity-100' : 'text-ink-2 opacity-40 hover:opacity-80'
            )}
            aria-pressed={lang === l}
            title={l === 'id' ? 'Bahasa Indonesia' : 'English'}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Left panel — gradient background */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-accent via-info to-ink" />
        <div className="absolute inset-0 bg-ink/40" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[10px] bg-white p-1.5 shadow-lg">
              <img src="/img/BATARA.png" alt={t.appName} className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="font-heading text-base font-bold text-white">{t.appName}</p>
              <p className="text-[11px] font-semibold text-white/70">{t.appTagline}</p>
            </div>
          </div>

          <div>
            <h2 className="max-w-md font-heading text-4xl font-bold leading-tight text-white">
              {t.login.leftPrefix}{' '}
              <TypeWriter words={t.login.typedWords} className="text-[#E8D9BE]" />
            </h2>
          </div>

          <p className="text-[11px] text-white/60">
            {t.appName} · v2.0
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full items-center justify-center overflow-hidden p-4 lg:w-1/2">
        <div className="pointer-events-none absolute -left-40 -top-40 hidden h-96 w-96 rounded-full bg-accent/15 blur-3xl lg:block" />
        <div className="relative z-10 w-full max-w-md">
          <div className="rounded-[10px] border border-line bg-surface p-8 shadow-xl">
            <div className="mb-8 text-center">
              <div className="mb-4 flex justify-center">
                <img src="/img/BATARA.png" alt={t.appName} className="h-24 w-auto object-contain" />
              </div>
              <h1 className="font-heading text-xl font-bold text-ink">{t.appName}</h1>
              <p className="mt-0.5 text-xs font-semibold text-accent">{t.appTagline}</p>
            </div>

            {error && (
              <div className="mb-6 rounded-[6px] border border-expired/30 bg-expired/10 p-3 text-center text-xs font-medium text-expired">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <Field label={t.login.email} required>
                <div className="relative">
                  <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@company.com"
                    required
                    className="pl-9"
                  />
                </div>
              </Field>

              <Field label={t.login.password} required>
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pl-9"
                  />
                </div>
              </Field>

              <Button type="submit" variant="accent" size="lg" disabled={isLoading} className="w-full">
                {isLoading ? t.login.processing : t.login.loginButton}
                <ArrowRight size={15} />
              </Button>
            </form>
          </div>
          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest text-ink-2 lg:hidden">
            {t.appName} · v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
