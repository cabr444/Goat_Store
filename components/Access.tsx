"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { readJsonResponse } from "@/lib/json-response";
import PasswordInput from "@/components/PasswordInput";
import AnimeWelcome from "@/components/AnimeWelcome";
import PeekGoat from "@/components/PeekGoat";
import AccessBackdrop from "@/components/AccessBackdrop";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
export default function Access({
  resetToken = "",
  recover = false,
  returnTo = "/",
}: {
  resetToken?: string;
  recover?: boolean;
  returnTo?: string;
}) {
  const router = useRouter();
  useEffect(() => {
    // Discard tickets left by the previous confirmation flow.
    try { sessionStorage.removeItem("goat-pending-registration"); } catch {}
  }, []);
  const [entering, setEntering] = useState(false);
  const enterStore = useCallback(() => { router.replace(returnTo); router.refresh(); }, [router, returnTo]);
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">(
      resetToken ? "reset" : recover ? "forgot" : "login",
    ),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [role, setRole] = useState("CLIENTE"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [confirmation, setConfirmation] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (mode === "reset" && password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(
        "/api/auth/" +
          (mode === "forgot"
            ? "forgot-password"
            : mode === "reset"
              ? "reset-password"
              : mode),
        {
          method: "POST",
          signal: AbortSignal.timeout(20000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "forgot"
              ? { email }
              : mode === "reset"
                ? { token: resetToken, password }
                : mode === "login"
                  ? { email, password }
                  : { name, email, password, role },
          ),
        },
      );
      const d = await readJsonResponse(r);
      if (mode === "login" && d.ok !== true) throw Error("No se pudo confirmar el inicio de sesión. Vuelve a intentarlo.");
      if (mode === "forgot" || mode === "reset") {
        setMessage(d.message);
        setPassword("");
        setConfirmation("");
      } else if (mode === "login") {
        setEntering(true);
      } else {
        setMode("login");
        setPassword("");
        setMessage(d.message || "Cuenta creada correctamente. Ya puedes iniciar sesión.");
      }
    } catch (e) {
      setError(e instanceof DOMException && ["TimeoutError", "AbortError"].includes(e.name) ? "El servidor está tardando en responder. Vuelve a intentarlo." : e instanceof TypeError ? "No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo." : e instanceof Error ? e.message : "No se pudo completar la solicitud.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="access-screen">
      {entering && <AnimeWelcome onComplete={enterStore} />}
      <div className="access-brand">
        <AccessBackdrop />
        <span className="eyebrow">
          <Sparkles size={15} /> TU MUNDO DIGITAL
        </span>
        <h1>
          Goats<span>.</span>
        </h1>
        <h2>
          Todo lo que te gusta,
          <br />
          en un solo lugar.
        </h2>
        <p>
          Streaming, música, productividad y combos con precios en pesos
          colombianos.
        </p>
        <div className="access-orb">GOATS ✦</div>
      </div>
      <div className="access-panel">
        <div className="access-form-scene">
        <PeekGoat />
        <form className="access-card" onSubmit={submit}>
          <div className="access-lock">
            <LockKeyhole size={22} />
          </div>
          <h2>
            {mode === "forgot"
              ? "Recupera tu contraseña"
              : mode === "reset"
                ? "Nueva contraseña"
                : mode === "login"
                  ? "Bienvenido de nuevo"
                  : "Crea tu cuenta"}
          </h2>
          <p>
            {mode === "forgot"
              ? "Te enviaremos un enlace a tu correo electrónico."
              : mode === "reset"
                ? "Elige una contraseña de entre 10 y 128 caracteres."
                : "Para ingresar a Goats, inicia sesión o regístrate."}
          </p>
          {(mode === "login" || mode === "register") && (
            <div className="auth-tabs">
              <button
                type="button"
                className={mode === "login" ? "chosen" : ""}
                onClick={() => {
                  setMode("login");
                  setError("");
                  setMessage("");
                }}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                className={mode === "register" ? "chosen" : ""}
                onClick={() => {
                  setMode("register");
                  setError("");
                  setMessage("");
                }}
              >
                Registrarse
              </button>
            </div>
          )}
          {mode === "register" && (
            <>
              <label>
                Nombre completo
                <input
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                />
              </label>
              <label>
                Tipo de cuenta
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="CLIENTE">Cliente</option>
                  <option value="VENDEDOR">Vendedor</option>
                </select>
              </label>
            </>
          )}
          {mode !== "reset" && (
            <label>
              Correo electrónico
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                autoComplete="email"
              />
            </label>
          )}
          {mode !== "forgot" && (
            <div className="access-password-field">
              <label htmlFor="access-password">Contraseña</label>
              <PasswordInput
                key={mode}
                id="access-password"
                required
                minLength={mode === "login" ? 1 : 10}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode !== "login" ? "Mínimo 10 caracteres" : "Tu contraseña"
                }
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </div>
          )}
          {mode === "reset" && (
            <div className="access-password-field">
              <label htmlFor="access-confirmation">Confirmar contraseña</label>
              <PasswordInput
                id="access-confirmation"
                required
                minLength={10}
                maxLength={128}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}
          {mode === "login" && (
            <a
              className="auth-link"
              href="/acceso?recuperar=1"
              onClick={(e) => {
                e.preventDefault();
                setMode("forgot");
                setError("");
                setMessage("");
                setPassword("");
              }}
            >
              ¿Olvidaste tu contraseña?
            </a>
          )}
          {message && <p role="status">{message}</p>}
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}
          <button
            className="button violet full"
            disabled={busy || entering || (mode === "reset" && !!message)}
          >
            {busy
              ? "Procesando..."
              : mode === "forgot"
                ? "Enviar enlace"
                : mode === "reset"
                  ? "Guardar contraseña"
                  : mode === "login"
                    ? "Entrar a Goats"
                    : "Crear cuenta"}
            <ArrowRight size={17} />
          </button>
          {(mode === "forgot" || mode === "reset") && (
            <a
              className="auth-link"
              href="/acceso"
              onClick={(e) => {
                e.preventDefault();
                setMode("login");
                setError("");
                setMessage("");
                setPassword("");
              }}
            >
              Volver a iniciar sesión
            </a>
          )}
          <small>
            El perfil de administrador se crea únicamente mediante la
            configuración privada del servidor.
          </small>
        </form>
        </div>
      </div>
    </main>
  );
}
