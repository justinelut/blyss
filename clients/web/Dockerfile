FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm rebuild

COPY . .

# NEXT_PUBLIC_* must be present at build time — Next.js inlines them into the
# client bundle. Pass via --build-arg from the deploy workflow.
ARG NEXT_PUBLIC_API_URL=https://api.blyss.co.ke
ARG NEXT_PUBLIC_FRONTEND_BASE_URL=https://blyss.co.ke
ARG NEXT_PUBLIC_CHECKOUT_BASE_URL=https://buy.blyss.co.ke

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_FRONTEND_BASE_URL=$NEXT_PUBLIC_FRONTEND_BASE_URL
ENV NEXT_PUBLIC_CHECKOUT_BASE_URL=$NEXT_PUBLIC_CHECKOUT_BASE_URL

RUN pnpm build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["pnpm", "start"]
