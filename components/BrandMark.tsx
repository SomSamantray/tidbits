import Link from "next/link";
import Image from "next/image";

export function BrandMark() {
  return (
    <Link href="/" className="brand-mark" aria-label="Tidbits home">
      <Image
        src="/brand/tidbits-wordmark.svg"
        alt=""
        className="brand-mark-full"
        width={180}
        height={48}
        priority
      />
      <Image src="/icon.svg" alt="" className="brand-mark-compact" width={42} height={42} priority />
      <span className="sr-only">Tidbits</span>
    </Link>
  );
}
