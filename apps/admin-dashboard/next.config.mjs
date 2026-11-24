/** @type {import('next').NextConfig} */
// NEXT_DIST_DIR lets a verification build live beside a running `next dev` without sharing .next.
export default { reactStrictMode: true, poweredByHeader: false, distDir: process.env.NEXT_DIST_DIR ?? ".next" };
