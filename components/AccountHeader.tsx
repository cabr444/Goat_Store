import type { StoreOptions } from "@/lib/store-settings";
import FloatingRechargeButton from "@/components/FloatingRechargeButton";
import BalanceRechargeLink from "@/components/BalanceRechargeLink";
import AdminNotificationBell from "@/components/AdminNotificationBell";
import ProfileMenu from "@/components/ProfileMenu";

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
    <><header className="header">
      <div className="container nav account-nav">
        <a className="logo" href="/">
          Goats<span>.</span>
        </a>
        <nav className="account-page-links" aria-label="Navegación de cuenta">
          <a href="/">Inicio</a>
          {(role !== "CLIENTE" || storeOptions.tiendaEnabled) && <a href="/store">Tienda</a>}
          {(role !== "CLIENTE" || storeOptions.segundaEnabled) && <a href="/segunda">Segunda</a>}
          <a href="/cursos">Cursos</a>
          {role === "ADMIN" && <a href="/administracion/ventas">Administración</a>}
          <a href="/perfil">Perfil</a>
          <a href="/pedidos">Pedidos</a>
        </nav>
        <div className="actions">
          <BalanceRechargeLink balance={balance} role={role}/>
          {role === "ADMIN" && <AdminNotificationBell />}
          <ProfileMenu name={name} role={role} />
        </div>
      </div>
    </header><FloatingRechargeButton role={role}/></>
  );
}
