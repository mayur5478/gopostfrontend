"use client";

import Image from "next/image";
import { useMemo } from "react";

interface MediaPreviewProps {
  media: string;
  blured:boolean;
}

export function MediaPreview({ media, blured }: MediaPreviewProps) {
  const src = media;

  // Detect content type
  const type = useMemo(() => {
    const lower = src.toLowerCase();
    if (lower.includes(".mp4") || lower.includes(".mov") || lower.includes(".webm"))
      return "video";
    if (lower.includes(".gif")) return "gif";
    return "image";
  }, [src]);
console.log("inside media preview", src)
  return (
    <div className={`${blured ? "blur-sm opacity-70" : ""} mt-4 w-full max-w-[320px] bg-gray-200 rounded-md overflow-hidden p-2 flex justify-center`}>      {type === "video" ? (
        <video
          src={src}
          controls
          className="max-w-full max-h-[420px] rounded-md object-contain"
        />
      ) : (
        <Image
          src={src}
          alt="Preview"
          width={800}
          height={800}
          className="max-w-full max-h-[420px] rounded-md object-contain"
          unoptimized={type === "gif"}
        />
      )}
    </div>
  );
}
