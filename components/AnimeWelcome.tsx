"use client";

import { useEffect, useRef } from "react";

export default function AnimeWelcome({ onComplete }: { onComplete?: () => void }) {
  const complete = useRef(onComplete);
  complete.current = onComplete;
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      complete.current?.();
      return;
    }
    const element = dialog.current;
    const finish = () => complete.current?.();
    element?.addEventListener("close", finish);
    element?.showModal();
    const timer = window.setTimeout(() => element?.close(), 3200);
    return () => { window.clearTimeout(timer); element?.removeEventListener("close", finish); element?.close(); };
  }, []);

  return (
    <dialog ref={dialog} className="anime-welcome" aria-labelledby="welcome-title">
      <button className="anime-skip" type="button" autoFocus onClick={() => dialog.current?.close()}>
        Omitir intro
      </button>
      <div className="anime-scene">
        <div className="anime-orbit" aria-hidden="true" />
        <span className="anime-spark anime-spark-one" aria-hidden="true">✦</span>
        <span className="anime-spark anime-spark-two" aria-hidden="true">✧</span>
        <span className="anime-spark anime-spark-three" aria-hidden="true">✦</span>
        <svg className="anime-mascot" viewBox="0 0 400 420" aria-hidden="true">
          <defs>
            <linearGradient id="welcome-coat" x2="1" y2="1"><stop stopColor="#a483ff" /><stop offset="1" stopColor="#6131da" /></linearGradient>
            <linearGradient id="welcome-horn" x2="0" y2="1"><stop stopColor="#d4c4ff" /><stop offset="1" stopColor="#9b74eb" /></linearGradient>
          </defs>
          <ellipse cx="200" cy="393" rx="110" ry="12" fill="#0c072a" opacity=".4" />
          <path d="M115 313Q133 263 200 265Q274 263 290 327L309 377Q204 414 93 377Z" fill="url(#welcome-coat)" stroke="#21103f" strokeWidth="7" />
          <path d="M159 285L200 337L243 285M180 315L173 357M221 316L229 357" fill="none" stroke="#d8c9ff" strokeWidth="6" strokeLinecap="round" />
          <path d="M113 171Q59 145 48 188Q67 225 119 225M286 171Q340 145 352 188Q333 225 282 225" fill="#f4ebff" stroke="#21103f" strokeWidth="7" />
          <path d="M96 184L122 204M304 184L278 204" stroke="#e9aace" strokeWidth="12" strokeLinecap="round" />
          <path d="M125 153Q91 97 121 47Q122 96 156 119M247 119Q280 96 279 47Q309 98 275 153" fill="url(#welcome-horn)" stroke="#21103f" strokeWidth="7" strokeLinejoin="round" />
          <path d="M115 185Q112 110 200 110Q289 111 286 186L277 234Q262 286 200 295Q140 286 123 234Z" fill="#fff6ff" stroke="#21103f" strokeWidth="7" />
          <path d="M119 177L132 117L158 132L184 100L209 131L248 111L280 177L249 155L233 176L203 144L175 175L150 150Z" fill="#251442" stroke="#21103f" strokeWidth="5" strokeLinejoin="round" />
          <path d="M142 195Q157 182 176 194M224 194Q243 182 258 195" fill="none" stroke="#21103f" strokeWidth="7" strokeLinecap="round" />
          <ellipse cx="162" cy="211" rx="15" ry="22" fill="#382063" /><ellipse cx="238" cy="211" rx="15" ry="22" fill="#382063" />
          <ellipse cx="164" cy="216" rx="9" ry="13" fill="#b28aff" /><ellipse cx="236" cy="216" rx="9" ry="13" fill="#b28aff" />
          <circle cx="167" cy="201" r="6" fill="white" /><circle cx="242" cy="201" r="6" fill="white" />
          <ellipse cx="138" cy="236" rx="15" ry="7" fill="#ef96bf" opacity=".65" /><ellipse cx="262" cy="236" rx="15" ry="7" fill="#ef96bf" opacity=".65" />
          <path d="M190 233Q200 241 210 233M181 250Q200 269 219 250" fill="none" stroke="#49214e" strokeWidth="5" strokeLinecap="round" />
          <path d="M288 337Q300 298 327 291Q346 296 335 318L321 349" fill="#fff6ff" stroke="#21103f" strokeWidth="7" />
          <path d="M320 289L332 270M326 299L348 288" stroke="#fff6ff" strokeWidth="9" strokeLinecap="round" />
          <text x="200" y="376" textAnchor="middle" fill="white" fontSize="27" fontWeight="900" fontFamily="Arial,sans-serif">GOAT ✦</text>
        </svg>
        <div className="anime-welcome-copy">
          <span>BIENVENIDO A GOAT</span>
          <h2 id="welcome-title">Tu mundo digital<br /><em>te espera.</em></h2>
          <p>Streaming, tecnología y nuevas aventuras.</p>
        </div>
        <div className="anime-progress" aria-hidden="true"><i /></div>
      </div>
    </dialog>
  );
}
