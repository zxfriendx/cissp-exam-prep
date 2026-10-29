# Build context is the REPO ROOT, not this directory:
#   docker build -f services/unlock/Dockerfile -t cissp-unlock .
# The image cuts its own bank at build time, so the 2.3 MB paid.json never has to
# be committed or shipped alongside -- content.json is the single source and
# scripts/build-paid.mjs is the only thing that reads it. See the repo .dockerignore.
FROM node:22.23-slim

ENV NODE_ENV=production
WORKDIR /srv

# Node 22 runs .ts directly, so there is no build step and no node_modules: the
# service has zero runtime dependencies by design.
COPY src/data/content.json  ./src/data/content.json
COPY scripts/build-paid.mjs ./scripts/build-paid.mjs
RUN node scripts/build-paid.mjs

COPY services/unlock/package.json ./services/unlock/package.json
COPY services/unlock/src          ./services/unlock/src

WORKDIR /srv/services/unlock
USER node
EXPOSE 8080
ENV PORT=8080
# No shell form: the process must be PID 1 so SIGTERM reaches it and the server
# closes its listeners instead of being killed at the end of the grace period.
CMD ["node", "src/server.ts"]
