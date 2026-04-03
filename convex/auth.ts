import { betterAuth } from "better-auth";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

export const authComponent = createClient<DataModel>(components.betterAuth);

const defaultAppOrigin = "http://localhost:4321";

const splitOrigins = (value?: string) =>
  value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0) ?? [];

const authBaseUrl =
  process.env.BETTER_AUTH_URL ?? process.env.CONVEX_SITE_URL ?? defaultAppOrigin;
const appOrigin = process.env.APP_ORIGIN ?? defaultAppOrigin;

// Keep browser origins separate from the Convex auth host.
export const authTrustedOrigins = Array.from(
  new Set([appOrigin, ...splitOrigins(process.env.APP_TRUSTED_ORIGINS)])
);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: authBaseUrl,
    appName: "Buildrop",
    trustedOrigins: authTrustedOrigins,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      crossDomain({ siteUrl: appOrigin }),
      convex({
        authConfig,
      }),
    ],
  });
};
