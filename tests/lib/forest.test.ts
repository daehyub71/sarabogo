import { describe, expect, it } from "vitest";
import { ForestError, parseMountains } from "@/lib/forest";

/** 실호출로 받은 실제 응답 형태를 fixture로 검증(2026-07-16). */
const OK = {
  response: {
    header: { resultCode: "0", resultMsg: "NORMAL_SERVICE" },
    body: {
      items: {
        item: [
          {
            lot: 127.487,
            frtrlId: "0000000050",
            ctpvNm: "경상남도",
            aslAltide: 1915.0,
            addrNm: "경상남도 하동군ㆍ함양군ㆍ산청군, 전라북도 남원시",
            frtrlNm: "지리산",
            mtnCd: "471500101",
            lat: 35.337,
          },
          {
            lot: 129.15,
            frtrlId: "0000000060",
            ctpvNm: "경상북도",
            aslAltide: 721.0,
            addrNm: "경상북도 청송군ㆍ영덕군",
            frtrlNm: "주왕산",
            mtnCd: "478500101",
            lat: 36.4,
          },
        ],
      },
    },
  },
};

describe("parseMountains", () => {
  it("frtrlNm/lat/lot/aslAltide를 도메인 필드로 매핑한다", () => {
    const [m] = parseMountains(OK);
    expect(m.name).toBe("지리산");
    expect(m.lat).toBeCloseTo(35.337);
    expect(m.lng).toBeCloseTo(127.487); // lot → lng
    expect(m.altitude).toBe(1915);
    expect(m.id).toBe("0000000050"); // frtrlId — 유일 키
  });

  it("경계에 걸친 산은 주소에 여러 시군구를 담는다", () => {
    const [, m] = parseMountains(OK);
    expect(m.name).toBe("주왕산");
    expect(m.address).toContain("청송군");
    expect(m.address).toContain("영덕군"); // 청송·영덕 경계
  });

  it("resultCode가 정상이 아니면 ForestError", () => {
    expect(() =>
      parseMountains({ response: { header: { resultCode: "30", resultMsg: "KEY ERR" } } }),
    ).toThrow(ForestError);
  });

  it("item이 없으면 빈 배열", () => {
    expect(parseMountains({ response: { body: { items: {} } } })).toEqual([]);
  });
});
