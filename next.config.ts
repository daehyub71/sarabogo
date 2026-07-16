import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 상위 디렉토리에 pnpm-lock.yaml이 있어 Next가 워크스페이스 루트를 오탐한다.
  // 이 프로젝트로 고정해 서버액션·output tracing이 올바른 경로를 쓰게 한다.
  outputFileTracingRoot: import.meta.dirname,
  // 관광공사 이미지 등 외부 도메인은 필요 시 images.remotePatterns에 추가한다.
};

export default nextConfig;
