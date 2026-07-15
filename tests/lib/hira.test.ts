import { describe, expect, it } from "vitest";
import { HiraError, parseFacilitiesXml } from "@/lib/hira";

/**
 * 심평원 XML 파싱 테스트.
 * fixture는 2026-07-12 실호출로 받은 실제 응답 형태다 (보령시 병원·약국).
 */

const HOSPITAL_XML = `<?xml version="1.0" encoding="UTF-8"?><response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header><body><items><item><addr>충청남도 보령시 죽성로 136,  (죽정동)</addr><clCd>11</clCd><clCdNm>종합병원</clCdNm><drTotCnt>22</drTotCnt><hospUrl>http://www.brh.or.kr</hospUrl><sgguCd>340400</sgguCd><sgguCdNm>보령시</sgguCdNm><sidoCd>340000</sidoCd><sidoCdNm>충남</sidoCdNm><telno>041-930-5114</telno><XPos>126.6228523</XPos><YPos>36.3811282</YPos><yadmNm>재단법인 아산사회복지재단 부속 보령아산병원</yadmNm><ykiho>ABC123</ykiho></item><item><addr>충청남도 보령시 청라면 질재로 373</addr><clCd>28</clCd><clCdNm>요양병원</clCdNm><sgguCdNm>보령시</sgguCdNm><sidoCdNm>충남</sidoCdNm><telno>041-000-0000</telno><XPos>126.55</XPos><YPos>36.40</YPos><yadmNm>보령요양병원</yadmNm></item></items></body></response>`;

const PHARMACY_XML = `<response><header><resultCode>00</resultCode></header><body><items><item><addr>충청남도 보령시 흥덕로 22</addr><clCdNm>약국</clCdNm><telno>041-936-4964</telno><XPos>126.6032250</XPos><YPos>36.3402040</YPos><yadmNm>오약국</yadmNm></item></items></body></response>`;

const ERROR_XML = `<response><header><resultCode>30</resultCode><resultMsg>SERVICE KEY IS NOT REGISTERED ERROR.</resultMsg></header></response>`;

describe("parseFacilitiesXml · 병원", () => {
  it("좌표를 XPos/YPos에서 숫자로 뽑는다 (지오코딩 불필요)", () => {
    const [h] = parseFacilitiesXml(HOSPITAL_XML, "hospital");
    expect(h.name).toBe("재단법인 아산사회복지재단 부속 보령아산병원");
    expect(h.lat).toBeCloseTo(36.3811282);
    expect(h.lng).toBeCloseTo(126.6228523);
    expect(h.kind).toBe("hospital");
    expect(h.clCdNm).toBe("종합병원");
    expect(h.tel).toBe("041-930-5114");
    expect(h.ykiho).toBe("ABC123");
  });

  it("여러 건을 파싱한다", () => {
    const list = parseFacilitiesXml(HOSPITAL_XML, "hospital");
    expect(list).toHaveLength(2);
    expect(list[1].name).toBe("보령요양병원");
  });

  it("없는 필드는 null로 둔다 (ykiho 누락 등)", () => {
    const list = parseFacilitiesXml(HOSPITAL_XML, "hospital");
    expect(list[1].ykiho).toBeNull();
  });
});

describe("parseFacilitiesXml · 약국", () => {
  it("약국 좌표와 이름을 파싱한다", () => {
    const [p] = parseFacilitiesXml(PHARMACY_XML, "pharmacy");
    expect(p.name).toBe("오약국");
    expect(p.kind).toBe("pharmacy");
    expect(p.lat).toBeCloseTo(36.3402040);
  });
});

describe("오류 처리", () => {
  it("resultCode가 00이 아니면 HiraError를 던진다", () => {
    expect(() => parseFacilitiesXml(ERROR_XML, "hospital")).toThrow(HiraError);
  });

  it("정상(00)인데 item이 없으면 빈 배열", () => {
    const empty = `<response><header><resultCode>00</resultCode></header><body><items></items></body></response>`;
    expect(parseFacilitiesXml(empty, "pharmacy")).toEqual([]);
  });
});
