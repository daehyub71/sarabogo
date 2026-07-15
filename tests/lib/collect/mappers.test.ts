import { describe, expect, it } from "vitest";
import { hiraToPlace, ktoToPlace } from "@/lib/collect/mappers";
import type { HiraFacility } from "@/lib/hira";
import type { KtoAreaItem } from "@/lib/kto";

describe("hiraToPlace", () => {
  const facility: HiraFacility = {
    name: "보령아산병원",
    kind: "hospital",
    clCdNm: "종합병원",
    address: "충청남도 보령시 죽성로 136",
    tel: "041-930-5114",
    lat: 36.3811282,
    lng: 126.6228523,
    sidoName: "충남",
    sigunguName: "보령시",
    ykiho: "ABC123",
  };

  it("좌표를 그대로 보존한다 (지오코딩 불필요)", () => {
    const p = hiraToPlace("region-1", facility);
    expect(p.lat).toBeCloseTo(36.3811282);
    expect(p.lng).toBeCloseTo(126.6228523);
    expect(p.kind).toBe("hospital");
    expect(p.source).toBe("hira");
  });

  it("종별·요양기호를 meta에 담는다", () => {
    const p = hiraToPlace("region-1", facility);
    expect(p.meta).toMatchObject({ clCdNm: "종합병원", ykiho: "ABC123" });
  });
});

describe("ktoToPlace", () => {
  const item: KtoAreaItem = {
    contentId: "3019714",
    contentTypeId: "12",
    title: "대천해수욕장",
    addr: "충청남도 보령시 신흑동",
    lat: 36.31,
    lng: 126.5,
    firstImage: "https://tong.visitkorea.or.kr/x.jpg",
  };

  it("contentTypeId를 kind로 매핑한다", () => {
    expect(ktoToPlace("r", item).kind).toBe("tour");
    expect(ktoToPlace("r", { ...item, contentTypeId: "32" }).kind).toBe("stay");
    expect(ktoToPlace("r", { ...item, contentTypeId: "15" }).kind).toBe("festival");
  });

  it("알 수 없는 contentTypeId는 tour로 폴백한다", () => {
    expect(ktoToPlace("r", { ...item, contentTypeId: "99" }).kind).toBe("tour");
  });

  it("대표이미지가 있으면 meta에 담고 없으면 null", () => {
    expect(ktoToPlace("r", item).meta).toMatchObject({ firstImage: expect.any(String) });
    expect(ktoToPlace("r", { ...item, firstImage: null }).meta).toBeNull();
  });
});
