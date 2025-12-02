/**
 * Override config used only by the monolithic Docker build.
 * It disables TypeScript build-time errors so the container image can be
 * produced even when there are TS type issues in the source. This file is
 * copied into the frontend build stage by `Dockerfile.monolithic` only and
 * does NOT change the repository's normal `next.config.js` or the
 * multicontainer build.
 */
module.exports = {
  typescript: {
    // Allow the production build to complete even if there are type errors.
    ignoreBuildErrors: true,
  },
};
