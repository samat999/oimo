// Creates .env.docker with a fresh random secret once. The file is ignored by git and .dockerignore, so the secret never enters the image or the source archive.
import {existsSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const port=process.env.OIMO_PORT||'5190';
if(existsSync('.env.docker'))console.log('.env.docker already exists; left unchanged.');
else{writeFileSync('.env.docker',`BETTER_AUTH_URL=http://localhost:${port}\nBETTER_AUTH_SECRET=${randomBytes(48).toString('base64url')}\nOIMO_TRUSTED_ORIGINS=\nOIMO_SINGLE_STORE=false\nTRUSTED_PROXIES=\nSMTP_HOST=\nSMTP_PORT=587\nSMTP_USER=\nSMTP_PASSWORD=\nSMTP_FROM=\n`,{mode:0o600});console.log(`Created .env.docker for http://localhost:${port}. Keep it private and back it up with the data volume.`)}
