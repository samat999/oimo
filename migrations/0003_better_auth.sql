-- Better Auth 1.7 email/password tables (same DDL its programmatic migration creates). IF NOT EXISTS keeps databases
-- created by `npm run setup` before this file existed compatible. After a Better Auth upgrade, run `npm run setup`:
-- it applies these files and then Better Auth's own migration check for any new columns.
CREATE TABLE IF NOT EXISTS "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" integer not null, "image" text, "createdAt" date not null, "updatedAt" date not null);
CREATE TABLE IF NOT EXISTS "session" ("id" text not null primary key, "expiresAt" date not null, "token" text not null unique, "createdAt" date not null, "updatedAt" date not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);
CREATE INDEX IF NOT EXISTS "session_userId_idx" on "session" ("userId");
CREATE TABLE IF NOT EXISTS "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" date, "refreshTokenExpiresAt" date, "scope" text, "password" text, "createdAt" date not null, "updatedAt" date not null);
CREATE INDEX IF NOT EXISTS "account_userId_idx" on "account" ("userId");
CREATE TABLE IF NOT EXISTS "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" date not null, "createdAt" date not null, "updatedAt" date not null);
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" on "verification" ("identifier");
CREATE TABLE IF NOT EXISTS "rateLimit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);
