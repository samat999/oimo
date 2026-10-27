import {headers} from 'next/headers';
import {auth} from './auth';
export async function getUser(){const session=await auth.api.getSession({headers:await headers()});if(!session)return null;return {userId:session.user.id,email:session.user.email.toLowerCase(),displayName:session.user.name,emailVerified:!!session.user.emailVerified}}
