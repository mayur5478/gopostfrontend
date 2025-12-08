"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface ThumbnailPickerProps {
  videoSrc: string;
  onThumbnailSelect: (image: string) => void;
  thumbnail: string | null;
  setThumbnail: Dispatch<SetStateAction<string | null>>;
  ratios: Record<string,AspectRatio>;//"aspect-[1/1]" | "aspect-[16/9]" | "aspect-[9/16]"; // 1:1, 16:9, 9:16
  selectedPlatform:string;

}
// type AspectRatio = "aspect-[1/1]" | "aspect-[16/9]" | "aspect-[9/16]";
type AspectRatio = "square" | "vertical" | "horizontal" |"";

export default function ThumbnailPicker(props: ThumbnailPickerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // const ratio ="aspect-[16/9]";
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [tempThumbnail, setTempThumbnail] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Convert ratio string to numeric aspect ratio
  const getAspectRatio = (ratio: string) => {
    switch (ratio) {
      case "aspect-[16/9]":
        return 16 / 9;
      case "aspect-[9/16]":
        return 9 / 16;
      default:
        return 1;
    }
  };

  // Capture frame safely and immediately
  const captureFrame = async (time: number) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // If seeked is slow, force await metadata
    if (video.readyState < 2) await new Promise((res) => (video.onloadeddata = res));

    video.currentTime = time;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const handleSeeked = () => {
      try {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const aspect = getAspectRatio(props.ratios[props.selectedPlatform]);

        let cropWidth = vw;
        let cropHeight = vw / aspect;

        if (cropHeight > vh) {
          cropHeight = vh;
          cropWidth = vh * aspect;
        }

        const startX = (vw - cropWidth) / 2;
        const startY = (vh - cropHeight) / 2;

        canvas.width = cropWidth;
        canvas.height = cropHeight;

        ctx.clearRect(0, 0, cropWidth, cropHeight);
        ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        try {
          const dataURL = canvas.toDataURL("image/png");
          // Force React to refresh image by adding timestamp
          setTempThumbnail(`${dataURL}?t=${Date.now()}`);
        } catch (error) {
          console.error("Canvas toDataURL failed (CORS):", error);
        }
      } catch (error) {
        console.error("Frame capture error:", error);
      }
    };

    video.removeEventListener("seeked", handleSeeked);
    video.addEventListener("seeked", handleSeeked, { once: true });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}s`;
  };

  const handleDownload = () => {
    if (!props.thumbnail) return;
    const link = document.createElement("a");
    link.href = props.thumbnail;
    link.download = `thumbnail-${props.ratios}.png`;
    link.click();
  };

  //  UseEffect to log video origin (help debug CORS)
  useEffect(() => {
    if (!props.videoSrc.startsWith(window.location.origin)) {
      console.warn("⚠️ Cross-origin video detected — ensure CORS headers or same-origin path.");
    }
  }, [props.videoSrc]);

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg">
      {/* Hidden video */}
      <video
        ref={videoRef}
        src={props.videoSrc}
        crossOrigin="anonymous" // ✅ Needed for canvas safety
        preload="auto"
        className="hidden"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />

      {/* Live Preview */}
      <div
        className={`relative w-[320px] bg-gray-100 overflow-hidden rounded-md border border-gray-300 ${props.ratios[props.selectedPlatform]}`}
      >
        {tempThumbnail ? (
          <img
            key={tempThumbnail} // ✅ Force refresh when URL changes
            src={tempThumbnail}
            alt="Live thumbnail preview"
            className="object-cover w-full h-full transition-all duration-300"
          />
        ) : (
          <div className="flex items-center justify-center text-gray-400 text-sm h-full">
            Move slider to preview frame
          </div>
        )}

        {/* 🕒 Time Overlay */}
        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded-md font-mono">
          {formatTime(currentTime)}
        </div>
      </div>

      {/* Timeline */}
      {duration > 0 && (
        <div className="relative w-full mt-4 select-none">
          <div className="flex justify-between text-xs text-[#5B5B64] mb-1">
            {Array.from({ length: 10 }).map((_, i) => {
              const t = Math.floor((i / 9) * duration);
              return <span key={i}>{t}s</span>;
            })}
          </div>

          <div className="relative w-full h-[50px] bg-[#FDE0471A] rounded-sm border border-[#FDE047]">
            <div
              className="absolute top-0 h-full bg-black w-[2px] transition-all"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={duration}
            step={0.2}
            value={currentTime}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setCurrentTime(val);
              captureFrame(val);
              setConfirmed(false);
            }}
            className="absolute top-0 left-0 w-full h-[50px] opacity-0 cursor-pointer"
          />
        </div>
      )}

      {/* Set Thumbnail */}
      <Button
        className="bg-[#FDE047] text-black hover:bg-[#FCD34D]"
        onClick={() => {
          if (tempThumbnail) {
            props.onThumbnailSelect(tempThumbnail);
            props.setThumbnail(tempThumbnail);
            setConfirmed(true);
          }
        }}
        disabled={!tempThumbnail}
      >
        Set Thumbnail
      </Button>

      {/* Show only confirmed thumbnail + download */}
      {confirmed && props.thumbnail && (
        <div className="flex flex-col items-center border rounded-lg p-3 mt-2">
          <div
            className={`relative w-[320px] bg-gray-100 overflow-hidden rounded-md ${props.ratios[props.selectedPlatform]}`}
          >
            <img
              src={props.thumbnail}
              alt="Confirmed thumbnail"
              className="object-cover w-full h-full"
            />
          </div>
          <Button variant="outline" onClick={handleDownload} className="mt-3 text-sm">
            Download
          </Button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
