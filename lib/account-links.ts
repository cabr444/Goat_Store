export const whatsappLink = (message: string) =>
  "https://wa.me/573223037790?text=" + encodeURIComponent(message);
export const supportLink = whatsappLink("Necesito soporte...");
export const rechargeLink = whatsappLink("quiero recargar saldo.");
