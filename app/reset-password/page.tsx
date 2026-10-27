'use client';
import {useState} from 'react';
import Link from 'next/link';
import {authClient} from '@/lib/auth-client';
import Brand from '../brand';
export default function Reset(){const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[done,setDone]=useState(false);return <div className="setup-page"><Brand/><div className="setup-card"><h1>Новый пароль</h1>{done?<><p>Пароль обновлён. Предыдущие сессии завершены.</p><Link className="button primary" href="/">Войти</Link></>:<form onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);try{const {error}=await authClient.resetPassword({newPassword:String(f.get('password')),token:new URLSearchParams(window.location.search).get('token')||''});if(error)throw new Error('Ссылка недействительна или истекла. Запросите новую.');setDone(true)}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}}><label>Пароль от 12 символов<input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password"/></label>{message&&<p role="alert">{message}</p>}<button className="button primary" disabled={busy}>Сохранить пароль</button></form>}</div></div>}
