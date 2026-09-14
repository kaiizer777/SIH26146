"use client";

import React, { useState, useEffect, useRef } from "react";
import { Unlock, Shield, ShieldAlert, KeyRound, ArrowRight, Eye, EyeOff, Lock } from "lucide-react";

const MASTER_PASSCODE = "54321";
const AUTH_STORAGE_KEY = "ntro_rag_clearance_token";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    const c = cookies[i].trim();
    if (c.startsWith(name + "=")) {
      return decodeURIComponent(c.substring(name.length + 1));
    }
  }
  return null;
}

function setAuthCookie(remember: boolean) {
  if (typeof document === "undefined") return;
  const maxAge = remember ? "; max-age=" + 60 * 60 * 24 * 30 : ""; // 30 days or session
  document.cookie = `${AUTH_STORAGE_KEY}=${encodeURIComponent(MASTER_PASSCODE)}; path=/; SameSite=Lax${maxAge}`;
}

function clearAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const cookieToken = getCookie(AUTH_STORAGE_KEY);
      // Cookie is the source of truth
      if (cookieToken === MASTER_PASSCODE) {
        setIsAuthenticated(true);
      } else {
        // If cookie was cleared or not set, wipe storage so it locks immediately!
        localStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated === false && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAuthenticated]);

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passcode.trim()) return;

    setIsSubmitting(true);
    setError(false);

    setTimeout(() => {
      if (passcode.trim() === MASTER_PASSCODE) {
        try {
          setAuthCookie(rememberMe);
          if (rememberMe) {
            localStorage.setItem(AUTH_STORAGE_KEY, MASTER_PASSCODE);
          } else {
            sessionStorage.setItem(AUTH_STORAGE_KEY, MASTER_PASSCODE);
          }
        } catch {
          // ignore storage error
        }
        setIsAuthenticated(true);
      } else {
        setError(true);
        setPasscode("");
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
      setIsSubmitting(false);
    }, 220);
  };

  if (isAuthenticated === null) {
    // Initial mount hydration placeholder (tactical air-gapped loader)
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
        <div className="relative w-12 h-12 mb-4 flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <Shield className="w-5 h-5 text-blue-600 absolute" />
        </div>
        <div className="tracking-widest uppercase text-slate-700 text-[11.5px] font-bold">
          Verifying Sovereign Enclave...
        </div>
        <div className="text-slate-400 text-[10px] mt-1 font-mono">
          Air-Gapped Node #26146 • FIPS-140-3
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-slate-900 selection:text-white">
      {/* Tactical Sovereign Grid Background */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />
      <div className="absolute inset-0 bg-radial-[circle_at_50%_18%] from-blue-50/60 via-transparent to-slate-100/70 pointer-events-none" />

      {/* Top Sovereign Header (Matches DocsHeader aesthetic) */}
      <header className="w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-6 py-3.5 flex items-center justify-between z-10 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/90 flex items-center justify-center shadow-xs">
            <Shield className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-[12px] font-mono font-bold tracking-wider text-slate-950 uppercase">
              NTRO Forensic Intelligence Suite
            </div>
            <div className="text-[10px] text-slate-500 font-mono tracking-wide">
              Bitcoin Forensic Engine • Classified Knowledge Base
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center space-x-2 text-[10.5px] font-mono text-slate-700 bg-slate-50 px-3 py-1.5 rounded-[7px] border-t border-t-white border-x border-slate-200 border-b border-b-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-800">Air-Gapped Enclave Clearance: Required</span>
        </div>
      </header>

      {/* Center Clearance Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 z-10">
        <div
          className={`w-full max-w-[430px] bg-white border-t border-t-white border-x border-slate-200/90 border-b border-b-slate-300 rounded-2xl p-7 sm:p-8 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.04)] relative ${
            error ? "animate-shake" : ""
          }`}
        >
          {/* Card Top Presentation */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 text-white border-t border-t-blue-300/80 border-x border-x-blue-600/80 border-b border-b-blue-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_12px_rgba(37,99,235,0.25)] flex items-center justify-center mb-3">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[10.5px] font-mono font-bold tracking-wider text-blue-700 uppercase mb-2.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Sovereign Enclave Access</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-950">Enter Access Passcode</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Enter your authorization passcode to unlock the classified intelligence dossier and neural copilot.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-700 font-bold">
                  Authorization Passcode
                </label>
                <span className="text-[10px] font-mono text-slate-400 font-semibold">
                  5 DIGITS
                </span>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  ref={inputRef}
                  type={showPassword ? "text" : "password"}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setError(false);
                  }}
                  placeholder="Enter 5-digit passcode"
                  maxLength={12}
                  className={`w-full bg-slate-50/70 border ${
                    error
                      ? "border-red-500 ring-2 ring-red-500/20 text-red-900 bg-red-50/40"
                      : "border-slate-300/90 focus:border-blue-600 focus:bg-white focus:ring-3 focus:ring-blue-500/15 text-slate-900"
                  } rounded-xl pl-10 pr-11 py-3 font-mono text-center sm:text-left text-base tracking-[0.25em] outline-none transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-xs placeholder:text-slate-400 shadow-[inset_0_1.5px_2.5px_rgba(15,23,42,0.06),0_1px_0_rgba(255,255,255,0.9)]`}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide passcode" : "Show passcode"}
                  title={showPassword ? "Hide passcode" : "Show passcode"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 text-xs text-red-700 bg-red-50/90 border border-red-200/90 px-3.5 py-2.5 rounded-xl font-mono shadow-2xs">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span>Authorization rejected. Invalid passcode.</span>
              </div>
            )}

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer accent-blue-600"
                />
                <span className="text-slate-700 text-[11.5px] font-medium">Remember on this terminal</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400 font-semibold">30-DAY PERSIST</span>
            </div>

            {/* Tactical 3D Primary Button */}
            <button
              type="submit"
              disabled={isSubmitting || !passcode.trim()}
              className="btn-tactical-primary w-full mt-2 py-3 px-4 rounded-xl text-white font-bold text-sm tracking-wide flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_3px_10px_rgba(30,64,175,0.25)]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="font-mono text-xs uppercase tracking-wider">Verifying Clearance...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-white" />
                  <span>Unlock Sovereign Workspace</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </form>

          {/* Air-Gap Sovereign Enclave Telemetry Badge Footer */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[10.5px] font-mono text-slate-500">
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-700 font-semibold">AIR-GAP ISOLATION</span>
            </div>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 font-medium">AES-256 SESSION</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 font-medium">FIPS-140-3</span>
          </div>
        </div>
      </main>

      {/* Bottom Footer (Matches Sovereign Light Theme) */}
      <footer className="w-full border-t border-slate-200/80 bg-white/80 py-3.5 px-6 text-center text-[10.5px] font-mono text-slate-500 z-10">
        NTRO Sovereign Intelligence Operations • Authorized Personnel Only • Confidential
      </footer>
    </div>
  );
}

export function lockSession() {
  try {
    clearAuthCookie();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.reload();
  } catch {
    // ignore
  }
}
