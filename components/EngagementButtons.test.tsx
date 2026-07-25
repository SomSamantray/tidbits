// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { EngagementButtons } from "./EngagementButtons";

const likeMock = vi.fn();
const shareMock = vi.fn();

vi.mock("@/app/actions/engagement", () => ({
  like: (...args: unknown[]) => likeMock(...args),
  share: (...args: unknown[]) => shareMock(...args),
}));

beforeEach(() => {
  likeMock.mockReset();
  shareMock.mockReset();
});

afterEach(cleanup);

describe("EngagementButtons — like", () => {
  it("optimistically increments and calls the like action on first click", async () => {
    likeMock.mockResolvedValue({ incremented: true, likeCount: 1 });
    render(<EngagementButtons tidbitId={1} header="H" body="Body" initialLikeCount={0} initialShareCount={0} />);

    fireEvent.click(screen.getByLabelText(/like this tidbit/i));

    expect(screen.getByText("1")).toBeDefined();
    await waitFor(() => expect(likeMock).toHaveBeenCalledWith(1));
  });

  it("does not call the like action again on a second click (already liked this session)", async () => {
    likeMock.mockResolvedValue({ incremented: true, likeCount: 1 });
    render(<EngagementButtons tidbitId={1} header="H" body="Body" initialLikeCount={0} initialShareCount={0} />);

    const button = screen.getByLabelText(/like this tidbit/i);
    fireEvent.click(button);
    await waitFor(() => expect(likeMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByLabelText(/liked/i));
    expect(likeMock).toHaveBeenCalledTimes(1);
  });

  it("reverts the optimistic count when the like action fails", async () => {
    likeMock.mockRejectedValue(new Error("network error"));
    render(<EngagementButtons tidbitId={1} header="H" body="Body" initialLikeCount={5} initialShareCount={0} />);

    fireEvent.click(screen.getByLabelText(/like this tidbit/i));
    expect(screen.getByText("6")).toBeDefined();

    await waitFor(() => expect(screen.getByText("5")).toBeDefined());
    expect(screen.getByLabelText(/like this tidbit/i)).toBeDefined();
    expect(screen.getByText(/couldn't like this tidbit/i)).toBeDefined();
  });

  it("does not send duplicate like requests while the first request is pending", async () => {
    let resolveLike: ((value: { incremented: boolean; likeCount: number }) => void) | undefined;
    likeMock.mockImplementation(() => new Promise((resolve) => { resolveLike = resolve; }));
    render(<EngagementButtons tidbitId={1} header="H" body="Body" initialLikeCount={0} initialShareCount={0} />);

    const button = screen.getByLabelText(/like this tidbit/i);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(likeMock).toHaveBeenCalledTimes(1);

    resolveLike?.({ incremented: true, likeCount: 1 });
    await waitFor(() => expect(screen.getByText("1")).toBeDefined());
  });
});

describe("EngagementButtons — share", () => {
  it("increments the share count via clipboard fallback when Web Share API is unavailable", async () => {
    shareMock.mockResolvedValue({ shareCount: 3 });
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });

    render(<EngagementButtons tidbitId={1} header="H" body="Body" initialLikeCount={0} initialShareCount={2} />);
    fireEvent.click(screen.getByLabelText(/share this tidbit/i));

    await waitFor(() => expect(screen.getByText("3")).toBeDefined());
    expect(shareMock).toHaveBeenCalledWith(1);
  });

  it("copies the complete header, body, and URL in the clipboard fallback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    shareMock.mockResolvedValue({ shareCount: 3 });
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    Object.defineProperty(window, "location", { configurable: true, value: { href: "http://localhost:3000/?category=science" } });

    render(<EngagementButtons tidbitId={1} header="A Header" body="The full body." initialLikeCount={0} initialShareCount={2} />);
    fireEvent.click(screen.getByLabelText(/share this tidbit/i));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("A Header\n\nThe full body.\n\nRead more: http://localhost:3000/?category=science"));
  });

  it("increments again on a second share (not deduplicated)", async () => {
    shareMock.mockResolvedValueOnce({ shareCount: 3 }).mockResolvedValueOnce({ shareCount: 4 });
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });

    render(<EngagementButtons tidbitId={1} header="H" body="Body" initialLikeCount={0} initialShareCount={2} />);
    const button = screen.getByLabelText(/share this tidbit/i);
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText("3")).toBeDefined());

    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText("4")).toBeDefined());
    expect(shareMock).toHaveBeenCalledTimes(2);
  });
});
