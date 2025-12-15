"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, X } from "lucide-react";
import { FaMagic } from "react-icons/fa";
import { useEffect, useRef, useState, Dispatch, SetStateAction } from "react"; // Added Dispatch
import { BiCloudUpload } from "react-icons/bi";
import { Switch } from "@/components/ui/switch";
import ThumbnailPicker from "../ThumbnailPicker";
import api from "@/lib/axios";
import { MEDIA_ENGINE_URLS } from "@/lib/urls";
import { toast } from "react-hot-toast";
import { FaFacebook, FaGoogleDrive, FaLinkedin, FaYoutube } from "react-icons/fa";
import { PostType } from "../../agents/create/types";

type AspectRatio = "square" | "vertical" | "horizontal";

type ThumbnailProps = {
  thumbnail: string | null;
  setThumbnail: Dispatch<SetStateAction<string | null>>;
  ratios: Record<string, AspectRatio>;
  resizedThumbnails: Record<string, string>;
  setResizedThumbnails: Dispatch<SetStateAction<Record<string, string>>>;
  selectedPost: PostType;
  setSelectedPost: Dispatch<SetStateAction<PostType>>;
  selectedPlatform: string;
  // --- NEW PROP ---
  autoPrompt?: string;
};

const IMAGE_SIZES: Record<AspectRatio, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  vertical: { width: 1080, height: 1920 },
  horizontal: { width: 1920, height: 1080 },
};

export default function Thumbnail(props: ThumbnailProps) {
  const mediaUrl = props.selectedPost.mediaUrl;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [switchThumbnail, setSwitchThumbnail] = useState(true);

  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- SYNC AUTO-PROMPT ---
  useEffect(() => {
    if (props.autoPrompt) {
      setAiPrompt(props.autoPrompt);
    }
  }, [props.autoPrompt]);

  const handleUploadLocal = () => { fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload only JPG or PNG image files.");
      e.target.value = ""; return;
    }
    const imageUrl = URL.createObjectURL(file);
    props.setThumbnail(imageUrl);
    setAiPrompt("");
  };

  const getMediaType = (mediaUrl: string | undefined): boolean | undefined => {
    if (!mediaUrl) return;
    const lower = mediaUrl.toLowerCase();
    const videoExtensions = [".mp4", ".mov", ".ts", ".avi", ".mkv", ".mpeg", ".wmv", ".flv", ".f4v", ".3gp", ".m4v", ".m2ts", ".mpg", ".ogv", ".webm", ".vob", ".mxf", ".mts"];
    return videoExtensions.some((ext) => lower.includes(ext));
  };
  const isVideo = getMediaType(mediaUrl);

  const handleGenerateAiThumbnail = async () => {
    props.setResizedThumbnails({});
    props.setThumbnail("");
    if (!aiPrompt.trim()) {
      toast.error("Please enter a prompt for the AI.");
      return;
    }
    setIsAiLoading(true);
    try {
      const response = await api.post(MEDIA_ENGINE_URLS.AI_THUMBNAIL, {
        prompt: aiPrompt,
        size: "1024x1024",
      });

      const { thumbnail_url } = response.data;
      props.setThumbnail(thumbnail_url);

      const selectedRatio = props.ratios[props.selectedPlatform];

      // Attempt resize
      if (selectedRatio == "vertical" || selectedRatio == 'horizontal') {
        try {
          const res = await api.post(MEDIA_ENGINE_URLS.RESIZE_IMAGE, {
            image_url: thumbnail_url,
            ...IMAGE_SIZES[selectedRatio],
            mode: "hybrid",
          });
          props.setResizedThumbnails(prev => ({ ...prev, [props.selectedPlatform]: res.data.image_url }));
        } catch (err) { console.error("Selected resize failed", err); }
      } else {
        props.setResizedThumbnails(prev => ({ ...prev, [props.selectedPlatform]: thumbnail_url }));
      }

      // Other platforms
      for (const post of props.selectedPost.posts) {
        const platformKey = post.platform.channel_type;
        if (platformKey === props.selectedPlatform) continue;
        const ratio = props.ratios[platformKey];
        if (ratio == "vertical" || ratio == "horizontal") {
          try {
            const res = await api.post(MEDIA_ENGINE_URLS.RESIZE_IMAGE, { image_url: thumbnail_url, ...IMAGE_SIZES[ratio], mode: "hybrid" });
            props.setResizedThumbnails(prev => ({ ...prev, [platformKey]: res.data.image_url }));
          } catch (e) { }
        } else {
          props.setResizedThumbnails(prev => ({ ...prev, [platformKey]: thumbnail_url }));
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to generate AI thumbnail.");
    } finally { setIsAiLoading(false); }
  };

  const handleClearThumbnail = () => { props.setThumbnail(""); setAiPrompt(""); if (fileInputRef.current) fileInputRef.current.value = ""; };
  const downloadFile = async (signedUrl: string, filename: string) => {
    const res = await fetch(signedUrl);
    if (!res.ok) throw new Error("Failed to download");

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(blobUrl);
  };
  return (
    <div className="w-full flex justify-between gap-6">
      <div className="w-full h-full border border-gray-200 rounded-md p-3">
        <div className="w-full flex justify-between mb-2">
          <h3 className="text-lg font-semibold text-[#000001E3]">Thumbnail</h3>
          <Switch checked={switchThumbnail} onCheckedChange={setSwitchThumbnail} className="data-[state=checked]:bg-[#FDE047]" disabled={!isVideo} />
        </div>

        <div className="w-full border-2 border-dashed border-[#E5E5E5] rounded-2xl p-6 mb-6 bg-[#FAFAFA]">
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-[#000001E3]">Generate Thumbnail with AI</h3>
            <p className="text-sm text-[#5B5B64]">Describe the thumbnail you want.</p>
            <Input
              placeholder="e.g., A cinematic photo..."
              value={aiPrompt} // Bound
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={isAiLoading}
            />
            <Button variant="default" onClick={handleGenerateAiThumbnail} disabled={isAiLoading} className="bg-gradient-to-r from-[#22D3EE] to-[#FFD600] text-white rounded-xl">
              {isAiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FaMagic className="w-4 h-4 mr-2 text-white" />}
              {isAiLoading ? "Generating..." : "Generate with AI"}
            </Button>
          </div>
        </div>

        {props.resizedThumbnails[props.selectedPlatform] && (
          <div className="w-full p-2 bg-gray-50 rounded-lg border relative">
            <div className="flex justify-between">
              <div><h3 className="text-base font-semibold text-[#000001E3]">Current Thumbnail</h3></div>
              <Button variant="ghost" size="icon" onClick={handleClearThumbnail}><X className="h-4 w-4" /></Button>
            </div>
            <div className="w-full max-w-xs rounded-md overflow-hidden border bg-gray-200 relative">
              <img src={props.resizedThumbnails[props.selectedPlatform]} alt="Thumbnail" className="w-full h-auto object-contain" />
              {/*Download Button */}
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white shadow-md hover:bg-gray-100"
                title="Download thumbnail"
                onClick={() => {
                  const url = props.resizedThumbnails[props.selectedPlatform] || props.thumbnail;
                  if (!url) return;
                  downloadFile(url, "thumbnail.png");

                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                  />
                </svg>
              </Button>
            </div>
          </div>
        )}

        {/* <div className="w-full border-2 border-dashed border-[#E5E5E5] rounded-2xl p-8 mb-6 bg-[#FAFAFA]">
          <div className="flex flex-col items-center text-center">
            <BiCloudUpload className="h-12 w-12 text-[#5B5B64] mb-4" />
            <h3 className="text-lg font-semibold text-[#000001E3] mb-2">Upload Custom Thumbnail</h3>
            <Button variant="outline" onClick={handleUploadLocal}>Upload Thumbnail</Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        </div> */}

        {/* {isVideo && (
          <div className={!switchThumbnail ? "opacity-50 pointer-events-none" : ""}>
            <ThumbnailPicker
              videoSrc={mediaUrl}
              onThumbnailSelect={(image) => props.setThumbnail(image)}
              thumbnail={props.thumbnail}
              setThumbnail={props.setThumbnail}
              ratios={props.ratios}
              selectedPlatform={props.selectedPlatform}
            />
          </div>
        )} */}
      </div>
    </div>
  );
}