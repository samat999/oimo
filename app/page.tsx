import {getUser} from '@/lib/identity';
import Workspace from './workspace';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getUser();return <Workspace user={user?{name:user.displayName,email:user.email}:null}/>}
