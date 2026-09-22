'use client';

import { useState } from 'react';
import { copyText } from '@/lib/copy';

export default function ItemThumb({
  src,
  alt,
  size = 40,
  copyName,
  requireCtrl,
}: {
  src: string | null | undefined;
  alt: string;
  size?: number;
  copyName?: string | null;
  requireCtrl?: boolean;
}) {
  const [err, setErr] = useState(false);

  function onClick(e: React.MouseEvent) {
    const ok = requireCtrl ? e.ctrlKey && e.shiftKey : e.shiftKey;
    if (ok && copyName) {
      e.preventDefault();
      e.stopPropagation();
      copyText(copyName);
    }
  }

  const title = copyName
    ? requireCtrl
      ? 'Ctrl+Shift+Click: copiar nome'
      : 'Shift+Click: copiar nome'
    : undefined;

  if (!src || err) {
    return (
      <span
        onClick={onClick}
        title={title}
        className="grid shrink-0 cursor-default place-items-center rounded-lg border border-line bg-bg2 text-muted"
        style={{ width: size, height: size }}
        aria-hidden
      >
        ?
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setErr(true)}
      onClick={onClick}
      title={title}
      className="shrink-0 cursor-pointer rounded-lg border border-line bg-bg2 object-contain"
      style={{ width: size, height: size }}
    />
  );
}
