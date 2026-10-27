# syntax=docker/dockerfile:1
# OIMO sales: Next.js standalone server + SQLite + private photo files on one persistent volume (/data).
FROM node:24-bookworm-slim AS deps
WORKDIR /app
# Build tools are only a fallback for better-sqlite3 when no prebuilt binary matches; they never reach the runtime image.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
# lib/auth.ts refuses to load without a secret. This throwaway value only satisfies module loading during the build;
# it is not written to the output, and the real secret is supplied at runtime from .env.docker.
RUN BETTER_AUTH_SECRET=build-only-placeholder-not-used-at-runtime-0000 OIMO_DATA_DIR=/tmp/build-data npm run build

FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=5188 HOSTNAME=0.0.0.0 OIMO_DATA_DIR=/data
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/scripts/migrate.mjs /app/scripts/admin-reset-password.mjs /app/scripts/backup.mjs /app/scripts/demo-owner.mjs ./scripts/
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 5188
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD ["node","-e","fetch('http://127.0.0.1:'+process.env.PORT+'/api/auth-config').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
# Apply pending migrations, then replace the shell with the server so it receives stop signals directly.
CMD ["sh","-c","node scripts/migrate.mjs && exec node server.js"]
