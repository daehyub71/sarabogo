import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FeedList } from "@/components/feed/FeedList";
import { RegionCard, type RegionCardData } from "@/components/RegionCard";

function makeRegion(i: number, over: Partial<RegionCardData> = {}): RegionCardData {
  return {
    id: `r-${i}`,
    name: `지역 ${i}`,
    imageUrl: null,
    hospitalMinutes: 8,
    avgMonthlyCost: 82,
    reviewCount: 12,
    avgStars: 4.3,
    tags: ["바다", "조용함"],
    ...over,
  };
}

describe("RegionCard (생활 지표 우선)", () => {
  it("병원 접근·한달실비를 노출한다", () => {
    render(<RegionCard region={makeRegion(1)} />);
    expect(screen.getByText("차로 8분")).toBeInTheDocument();
    expect(screen.getByText("82만원")).toBeInTheDocument();
  });

  it("지표가 null이면 '정보 없음'을 노출한다 (0으로 치환하지 않음)", () => {
    render(
      <RegionCard
        region={makeRegion(2, { hospitalMinutes: null, avgMonthlyCost: null, avgStars: null })}
      />,
    );
    expect(screen.getAllByText("정보 없음").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("0만원")).toBeNull();
  });
});

describe("FeedList (무한 스크롤 금지)", () => {
  it("처음에는 10개만 보여준다", () => {
    const regions = Array.from({ length: 23 }, (_, i) => makeRegion(i));
    render(<FeedList regions={regions} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });

  it("'더 보기'로 10개씩 이어붙인다", async () => {
    const user = userEvent.setup();
    const regions = Array.from({ length: 23 }, (_, i) => makeRegion(i));
    render(<FeedList regions={regions} />);
    await user.click(screen.getByRole("button", { name: /더 보기/u }));
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    await user.click(screen.getByRole("button", { name: /더 보기/u }));
    expect(screen.getAllByRole("listitem")).toHaveLength(23);
  });

  it("전부 보이면 '더 보기' 버튼이 사라진다", async () => {
    const user = userEvent.setup();
    const regions = Array.from({ length: 12 }, (_, i) => makeRegion(i));
    render(<FeedList regions={regions} />);
    await user.click(screen.getByRole("button", { name: /더 보기/u }));
    expect(screen.queryByRole("button", { name: /더 보기/u })).toBeNull();
  });
});
