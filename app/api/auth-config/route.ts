import {smtpEnabled} from '@/lib/auth';
export const dynamic='force-dynamic';
export async function GET(){return Response.json({passwordReset:smtpEnabled,emailVerification:smtpEnabled},{headers:{'Cache-Control':'no-store'}})}
