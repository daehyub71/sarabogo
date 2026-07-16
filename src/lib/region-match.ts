/**
 * 지역명 → 주소 매칭 토큰.
 * "충남 보령시" → "보령", "강원 정선군" → "정선".
 * 100대명산 주소(addrNm)에 이 토큰이 들어가면 그 지역 근처로 본다.
 */
export function countyMatchToken(regionName: string): string {
  const parts = regionName.trim().split(/\s+/);
  const county = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  return county.replace(/[시군구]$/, "");
}
