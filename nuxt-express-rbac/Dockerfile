# ---- Build stage -----------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# npm 10.9.x has a known bug (arborist: "Cannot read properties of null
# (reading 'edgesOut')") when resolving deps without a lockfile. Upgrading
# to npm 11 before installing works around it.
RUN npm install -g npm@11

COPY package*.json ./
RUN npm install

COPY . .

# NUXT_PUBLIC_API_BASE can be provided at build time (making its value fixed in
# the bundle) or, preferably, injected when the container starts (see below).
# Nitro re-reads NUXT_PUBLIC_* variables at runtime, so providing a default
# value here is sufficient.
ARG NUXT_PUBLIC_API_BASE=http://localhost:5000/api
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE

RUN npm run build

# ---- Runtime stage -----------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# non-root user
RUN addgroup -S nuxt && adduser -S nuxt -G nuxt

COPY --from=builder --chown=nuxt:nuxt /app/.output ./.output

USER nuxt

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]