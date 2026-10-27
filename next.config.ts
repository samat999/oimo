import type {NextConfig} from 'next';
const dev=process.env.NODE_ENV!=='production';
// Next inlines its bootstrap scripts, so script-src needs 'unsafe-inline'; everything else is limited to this origin.
const csp=["default-src 'self'",`script-src 'self' 'unsafe-inline'${dev?" 'unsafe-eval'":''}`,"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com","font-src 'self' https://fonts.gstatic.com","img-src 'self' blob: data:","connect-src 'self'","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'"].join('; ');
// The tracer would otherwise copy local databases (data/, backups) into .next/standalone. Next matches these globs loosely,
// so only file extensions no framework file uses are listed; scripts/postbuild.mjs fails the build if anything private remains.
const config:NextConfig={output:'standalone',serverExternalPackages:['better-sqlite3'],outputFileTracingExcludes:{'**':['**/*.sqlite','**/*.sqlite-*']},async headers(){return [{source:'/:path*',headers:[{key:'Content-Security-Policy',value:csp},{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'no-referrer'},{key:'X-Frame-Options',value:'DENY'},{key:'Permissions-Policy',value:'camera=(self), microphone=(), geolocation=()'}]}]}};
export default config;
