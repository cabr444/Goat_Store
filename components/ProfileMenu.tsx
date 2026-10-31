"use client";
import { useEffect, useId, useRef, useState } from "react";
import { UserRound, Package, MessageCircle, Wallet, LayoutDashboard } from "lucide-react";
import { supportLink, rechargeLink } from "@/lib/account-links";
export default function ProfileMenu({ name, role }: { name?: string; role?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const openedByHover = useRef(false);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const initials = name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <div
      ref={root}
      className="profile-menu"
      onMouseEnter={() => {
        if (window.matchMedia("(hover: hover)").matches) { openedByHover.current = true; setOpen(true); }
      }}
      onMouseLeave={() => {
        openedByHover.current = false;
        if (!root.current?.contains(document.activeElement)) setOpen(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={button}
        className="profile-circle"
        type="button"
        aria-label="Abrir menú de cuenta"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => { if (openedByHover.current) { openedByHover.current = false; setOpen(true); } else setOpen(value => !value); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            requestAnimationFrame(() =>
              root.current?.querySelector<HTMLAnchorElement>("a")?.focus(),
            );
          }
        }}
      >
        {initials || <UserRound size={18} />}
      </button>
      {open && (
        <nav
          id={id}
          className="profile-dropdown"
          aria-label="Opciones de cuenta"
        >
          <span className="profile-menu-name">{name || "Mi cuenta"}</span>
          {role === "ADMIN" && <a href="/administracion/ventas"><LayoutDashboard size={17} />Administración</a>}
          <a href="/perfil">
            <UserRound size={17} />
            Perfil
          </a>
          <a href="/pedidos">
            <Package size={17} />
            Pedidos
          </a>
          <a href={supportLink} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={17} />
            Soporte
          </a>
          <a href={rechargeLink} target="_blank" rel="noopener noreferrer">
            <Wallet size={17} />
            Recargas
          </a>
        </nav>
      )}
    </div>
  );
}
