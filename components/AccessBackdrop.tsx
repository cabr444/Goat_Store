"use client";
import { useState } from "react";
import { Gamepad2, Headphones, Play, Monitor, Pause } from "lucide-react";

export default function AccessBackdrop() {
  const [paused, setPaused] = useState(false);
  return <>
    <div className={"access-anime-backdrop" + (paused ? " is-paused" : "")} aria-hidden="true">
      <div className="access-energy access-energy-one" />
      <div className="access-energy access-energy-two" />
      <div className="access-portal"><i /><i /><i /></div>
      <span className="access-float access-float-play"><Play size={30} fill="currentColor" /></span>
      <span className="access-float access-float-music"><Headphones size={30} /></span>
      <span className="access-float access-float-game"><Gamepad2 size={32} /></span>
      <span className="access-float access-float-tech"><Monitor size={30} /></span>
      <span className="access-star access-star-one">✦</span>
      <span className="access-star access-star-two">✧</span>
      <span className="access-star access-star-three">✦</span>
    </div>
    <button type="button" className="access-animation-toggle" aria-pressed={paused} onClick={() => setPaused(!paused)}>
      {paused ? <Play size={13} /> : <Pause size={13} />}
      {paused ? "Animar fondo" : "Pausar fondo"}
    </button>
  </>;
}
