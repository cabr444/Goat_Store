import type { StoreOptions } from "@/lib/store-settings";
import { Wallet } from "lucide-react";
import ProfileMenu from "@/components/ProfileMenu";
import { cop } from "@/lib/account";
export default function AccountHeader({
  name,
  balance,
  role,
  storeOptions,
}: {
  name: string;
  balance: number;
  role: string;
  storeOptions: StoreOptions;
}) {
  return (
    <header className="header">
      <div className="container nav account-nav">
        <a className="logo" href="/">
          Goats<span>.</span>
        </a>
        <nav className="account-page-links" aria-label="Navegación de cuenta">
          <a href="/">Inicio</a>
          {(role !== "CLIENTE" || storeOptions.tiendaEnabled) && <a href="/store">Tienda</a>}
          {(role !== "CLIENTE" || storeOptions.segundaEnabled) && <a href="/segunda">Segunda</a>}
          <a href="/cursos">Cursos</a>
          <a href="/perfil">Perfil</a>
          <a href="/pedidos">Pedidos</a>
        </nav>
        <div className="actions">
          <span className="balance-chip">
            <Wallet size={17} />
            {cop(balance)}
          </span>
          <ProfileMenu name={name} />
        </div>
      </div>
    </header>
  );
}
