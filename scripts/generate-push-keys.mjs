import webpush from 'web-push';
import { writeFileSync } from 'node:fs';
const keys=webpush.generateVAPIDKeys();
writeFileSync('.env.push',`VAPID_PUBLIC_KEY="${keys.publicKey}"\nVAPID_PRIVATE_KEY="${keys.privateKey}"\nVAPID_SUBJECT="mailto:admin@your-domain.com"\n`,{flag:'wx',mode:0o600});
console.log('Keys saved privately in .env.push. Set VAPID_SUBJECT to your contact email, then copy the three values into your hosting environment settings. Keep this key pair stable.');
