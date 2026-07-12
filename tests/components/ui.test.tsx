import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/ui/StarRating";

describe("Badge (블랙야크 이식)", () => {
  it("children을 렌더한다", () => {
    render(<Badge>정상</Badge>);
    expect(screen.getByText("정상")).toBeInTheDocument();
  });

  it("톤별 팔레트 토큰을 반영한다", () => {
    const { rerender } = render(<Badge tone="accent">accent</Badge>);
    expect(screen.getByText("accent").className).toMatch(/var\(--color-accent\)/u);
    rerender(<Badge tone="warm">warm</Badge>);
    expect(screen.getByText("warm").className).toMatch(/var\(--color-accent-warm\)/u);
  });

  it("className을 병합하되 기본을 잃지 않는다", () => {
    render(<Badge className="ml-2">custom</Badge>);
    const el = screen.getByText("custom");
    expect(el.className).toMatch(/ml-2/u);
    expect(el.className).toMatch(/rounded-/u);
  });
});

describe("StarRating (null 정책)", () => {
  it("null이면 '정보 없음'을 노출하고 별을 그리지 않는다", () => {
    render(<StarRating value={null} />);
    expect(screen.getByText("정보 없음")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("값이 있으면 접근성 레이블에 점수를 담는다", () => {
    render(<StarRating value={4.3} />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "별점 5점 만점에 4.3점",
    );
  });

  it("null을 0으로 표시하지 않는다 (0.0 텍스트가 없다)", () => {
    render(<StarRating value={null} />);
    expect(screen.queryByText("0.0")).toBeNull();
  });
});
