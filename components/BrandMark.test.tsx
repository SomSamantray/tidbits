// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BrandMark } from "./BrandMark";

afterEach(cleanup);

describe("BrandMark", () => {
  it("exposes an accessible link to Tidbits and both responsive marks", () => {
    render(<BrandMark />);

    expect(screen.getByRole("link", { name: "Tidbits home" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link").querySelector(".brand-mark-full")?.getAttribute("src")).toBe(
      "/brand/tidbits-wordmark.svg",
    );
    expect(screen.getByRole("link").querySelector(".brand-mark-compact")?.getAttribute("src")).toBe(
      "/icon.svg",
    );
  });
});
