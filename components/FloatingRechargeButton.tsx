import { ArrowUpRight, Wallet } from 'lucide-react';
import { rechargeLink } from '@/lib/account-links';
export default function FloatingRechargeButton({ role }: { role?: string }) {
  const admin = role === 'ADMIN';
  return <a className="floating-recharge" href={admin ? '/administracion/recargas' : rechargeLink} target={admin ? undefined : '_blank'} rel={admin ? undefined : 'noopener noreferrer'} aria-label="Recargar saldo — acceso rápido"><span className="floating-recharge-icon"><Wallet size={28} aria-hidden="true"/></span><span><small>¿Necesitas saldo?</small><strong>Recargar saldo</strong></span><ArrowUpRight size={22} aria-hidden="true"/></a>;
}
