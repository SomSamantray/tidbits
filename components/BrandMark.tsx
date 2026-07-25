import Link from "next/link";

export function BrandMark() {
  return (
    <Link href="/" className="brand-mark" aria-label="Tidbits home">
      <img
        src="/brand/tidbits-wordmark.svg"
        alt=""
        className="brand-mark-full"
        width={180}
        height={48}
      />
      <img src="/icon.svg" alt="" className="brand-mark-compact" width={42} height={42} />
      <span className="sr-only">Tidbits</span>
    </Link>
  );
}
