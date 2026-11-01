import { Wallet } from 'lucide-react';
import { rechargeLink } from '@/lib/account-links';
export default function BalanceRechargeLink({ balance, role }: { balance: number; role: string }) {
  return <a className="balance-chip balance-recharge-link" href={role === 'ADMIN' ? '/administracion/recargas' : rechargeLink} target={role === 'ADMIN' ? undefined : '_blank'} rel={role === 'ADMIN' ? undefined : 'noopener noreferrer'} aria-label={`Saldo $${new Intl.NumberFormat('es-CO').format(balance)} COP. Recargar saldo`}><Wallet size={17}/><span><strong>${new Intl.NumberFormat('es-CO').format(balance)}</strong><small>Recargar saldo</small></span></a>;
}
