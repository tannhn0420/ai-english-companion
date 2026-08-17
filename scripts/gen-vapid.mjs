// Sinh cặp VAPID key cho Web Push: node scripts/gen-vapid.mjs
// - Public key: đặt vào build env VITE_VAPID_PUBLIC_KEY (Cloudflare) + local .env
// - Private key: đặt làm Supabase secret VAPID_PRIVATE (KHÔNG commit)
import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log('VITE_VAPID_PUBLIC_KEY =', publicKey);
console.log('VAPID_PUBLIC         =', publicKey);
console.log('VAPID_PRIVATE        =', privateKey);
console.log('\nĐặt VITE_VAPID_PUBLIC_KEY vào build env của app; VAPID_PUBLIC/PRIVATE/SUBJECT làm Supabase secret.');
