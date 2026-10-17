"use client";
import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Ocultar contraseña" : "Mostrar contraseña";
  return <span className="password-input">
    <input {...props} type={visible ? "text" : "password"} />
    <button type="button" className="password-visibility" disabled={props.disabled} aria-label={label} title={label} aria-pressed={visible} aria-controls={props.id} onClick={() => setVisible(!visible)}>
      {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
    </button>
  </span>;
}
