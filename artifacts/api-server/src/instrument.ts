// Sentry not yet configured — @sentry/node requires OpenTelemetry which conflicts with esbuild bundling.
// Set up SENTRY_DSN env var and uncomment when build config supports external node_modules.
export const Sentry = {
  setupExpressErrorHandler: (_app: unknown) => {},
};
