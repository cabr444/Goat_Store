import { Wallet } from "lucide-react";
import ProfileMenu from "@/components/ProfileMenu";
import { cop } from "@/lib/account";
export default function AccountHeader({
  name,
  balance,
}: {
  name: string;
  balance: number;
}) {
  return (
    <header className="header">
      <div className="container nav account-nav">
        <a className="logo" href="/">
          Goat<span>.</span>
        </a>
        <nav className="account-page-links" aria-label="Navegación de cuenta">
          <a href="/">Inicio</a>
          <a href="/store">Tienda</a>
          <a href="/segunda">Segunda</a>
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
