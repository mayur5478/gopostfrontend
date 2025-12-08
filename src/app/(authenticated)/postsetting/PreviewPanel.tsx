"use client";

import { Dispatch, JSX, SetStateAction, useEffect, useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { MediaPreview } from "./MediaPreview";
import { BiRectangle } from "react-icons/bi";
import { LuRectangleHorizontal, LuRectangleVertical } from "react-icons/lu";
import {
  FaFacebook,
  FaGoogleDrive,
  FaLinkedin,
  FaYoutube,
} from "react-icons/fa";
import { PostType } from "../agents/create/types";
import api from "@/lib/axios";
import { MEDIA_ENGINE_URLS } from "@/lib/urls";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type AspectRatio = "square" | "vertical" | "horizontal";
type Modes = "fill" | "crop" | "hybrid";
const IMAGE_SIZES: Record<AspectRatio, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  vertical: { width: 1080, height: 1920 },
  horizontal: { width: 1920, height: 1080 },
  //  '':{width: 1080, height: 1080}
};

interface PreviewPanelProps {
  post: PostType;
  ratios: Record<string, AspectRatio>;
  setRatios: Dispatch<SetStateAction<Record<string, AspectRatio>>>;
  selectedPlatform: string;
  setSelectedPlatform: Dispatch<SetStateAction<string>>;
  resizedAspect: Record<AspectRatio, string>;
  setResizedAspect: Dispatch<SetStateAction<Record<AspectRatio, string>>>;
  updatedMedia: Record<string, string>;
  setUpdatedMedia: Dispatch<SetStateAction<Record<string, string>>>;
}

export default function PreviewPanel(props: PreviewPanelProps) {

  const platforms = props.post.posts.map((p: any) => ({
    id: p.platform.id,
    name:
      p.platform.channel_type.charAt(0).toUpperCase() +
      p.platform.channel_type.slice(1),
    channel: p.platform.channel_type,
    icon:
      p.platform.channel_type === "facebook"
        ? FaFacebook
        : p.platform.channel_type === "google"
          ? FaGoogleDrive
          : p.platform.channel_type === "linkedin"
            ? FaLinkedin
            : p.platform.channel_type === "youtube"
              ? FaYoutube
              : null,
  }));

  const currentPlatform = platforms.find(
    (p: any) => p.channel === props.selectedPlatform
  );
  const [resizeMode, setResizeMode] = useState<Modes>("hybrid");
  const [disableDownload, setDisableDownload] = useState(false);
  const aspectOptions: { id: AspectRatio; icon: JSX.Element; }[] =
    [
      { id: "square", icon: <BiRectangle className="w-5 h-5" /> },
      {
        id: "vertical",
        icon: <LuRectangleVertical className="w-5 h-5" />
      },
      {
        id: "horizontal",
        icon: <LuRectangleHorizontal className="w-5 h-5" />
      },
    ];
  const getMediaType = (mediaUrl: string | undefined): boolean | undefined => {
    if (!mediaUrl) return;

    const lower = mediaUrl.toLowerCase();
    const videoExtensions = [
      ".mp4", ".mov", ".ts", ".avi", ".mkv", ".mpeg",
      ".wmv", ".flv", ".f4v", ".3gp", ".m4v", ".m2ts",
      ".mpg", ".ogv", ".webm", ".vob", ".mxf", ".mts",
    ];
    if (videoExtensions.some((ext) => lower.includes(ext))) {
      return true;
    }
    if (lower.includes(".gif")) return false;
    return false;
  };
  const title = props.post.posts.find(p => p.platform.channel_type === props.selectedPlatform)?.title;

  const modes: Modes[] = ["fill", "crop", "hybrid"];

  const url = props.resizedAspect[props.ratios[props.selectedPlatform]] || props.updatedMedia[props.selectedPlatform] || props.post.posts.find(p => p.platform.channel_type === props.selectedPlatform)?.mediaUrl;
  const isVideo = getMediaType(url);
  const [isLoading, setIsLoading] = useState(false);
const [resizeMessage, setResizeMessage]=useState('Your Media is being resized. Please wait...')

  const generateResize = async (aspect: AspectRatio, mode: Modes) => {
    // const size = props.ratios[props.selectedPlatform];
    // console.log("size hre is", size);
    setDisableDownload(true);
    setIsLoading(true);
    try {
      let outputUrl: string;
      if (isVideo) {
        // ----- VIDEO RESIZE -----
        const { data } = await api.post(MEDIA_ENGINE_URLS.RESIZE_MEDIA, {
          video_url: url,
          presets: aspect,
        });
        outputUrl = data.resized_videos[aspect].url;
        // props.setResizedAspect((prev) => ({
        //   ...prev,
        //   [size]: outputUrl,
        // }));
      } else {
        // ----- IMAGE RESIZE -----
        const resizeSettings = IMAGE_SIZES[aspect];

        const { data } = await api.post(MEDIA_ENGINE_URLS.RESIZE_IMAGE, {
          image_url: url,
          ...resizeSettings,
          mode: mode,
        });
        outputUrl = data.image_url;
        // props.setResizedAspect((prev) => ({
        //   ...prev,
        //   [size]: data.image_url,
        // }));

        console.log("inside image resize", props.resizedAspect);
      }
      props.setResizedAspect((prev) => ({
        ...prev,
        [aspect]: outputUrl,
      }));
    } catch (err) {
      setResizeMessage("Something went wrong couldn't resize your media. Sorry!")
      console.error("Resize error:", err);
    }
    finally {
      setIsLoading(false);
      setDisableDownload(false);
    }
  };
  useEffect(() => {
    // if (!isVideo) {
    //   generateResize();
    // }
    console.log("inside preview panel", props.resizedAspect, props.ratios)
  }, [props.resizedAspect, props.ratios]);
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
    <div className="w-1/2 h-full border border-gray-200 rounded-md p-4">
      <div className="w-full flex p-2 justify-between items-center border-b border-gray-200">
        <p className="font-semibold">Post Preview</p>

        <Select
          value={props.selectedPlatform}
          onValueChange={props.setSelectedPlatform}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue>
              <div className="flex items-center gap-2">
                {currentPlatform?.icon && (
                  <currentPlatform.icon className="w-4 h-4" />
                )}
                <span>{currentPlatform?.name}</span>
              </div>
            </SelectValue>
          </SelectTrigger>

          <SelectContent>
            {platforms.map((p: any) => (
              <SelectItem key={p.id} value={p.channel}>
                <div className="flex items-center gap-2">
                  {p.icon && <p.icon className="text-gray-600 w-4 h-4" />}
                  {p.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ASPECT BUTTONS */}
      <div className="w-full flex flex-col justify-center items-center p-1">
        <div className="flex w-full items-center relative p-1">
          {/* Center: aspect buttons */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <div className="flex w-fit bg-[#0000010A] justify-center rounded-md overflow-hidden mb-2 mt-2">
              {aspectOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    props.setRatios((prev) => ({
                      ...prev,
                      [props.selectedPlatform]: option.id,
                    }));
                    generateResize(option.id, resizeMode);
                  }}
                  className={`p-2 transition-all ${props.ratios[props.selectedPlatform] === option.id
                      ? "bg-white shadow-sm text-black"
                      : "bg-transparent text-gray-600 hover:bg-gray-100"
                    }`}
                >
                  {option.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Download button */}
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (!url) return;
                downloadFile(
                  props.resizedAspect[props.ratios[props.selectedPlatform]] ||
                  props.post.mediaUrl, `${title}-${props.ratios[props.selectedPlatform]}.mp4`
                );
              }}
              className="w-8 h-8 rounded-full bg-white shadow-md hover:bg-gray-100"
              title="Download resized Media"
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

        {/* Resize Mode Buttons */}
        {!isVideo && (
          <div className="flex w-fit bg-[#0000010A] justify-center rounded-md overflow-hidden">
            {modes.map((mode: Modes) => (
              <button
                key={mode}
                onClick={() => {
                  setResizeMode(mode);
                  generateResize(props.ratios[props.selectedPlatform], mode);

                }}
                className={`p-2 px-2 capitalize transition-all text-sm ${resizeMode === mode
                  ? "bg-white shadow-sm text-black"
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
                  }`}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* MEDIA PREVIEW */}
      {/* <div className="w-full flex justify-center relative">
        {isLoading ? (
          <>
          <MediaPreview
            key={props.post.mainId + props.selectedPlatform}
            media={
              props.resizedAspect[props.ratios[props.selectedPlatform]] || props.updatedMedia[props.selectedPlatform] ||
              props.post.posts.find(
                (p) => p.platform.channel_type === props.selectedPlatform
              )?.mediaUrl ||
              ""
            }
            blured={true}
          />
           <Loader2 className="w-10 h-10 animate-spin text-black absolute" />
                </>   
        ) : (
          <MediaPreview
            key={props.post.mainId + props.selectedPlatform}
            media={
              props.resizedAspect[props.ratios[props.selectedPlatform]] || props.updatedMedia[props.selectedPlatform] ||
              props.post.posts.find(
                (p) => p.platform.channel_type === props.selectedPlatform
              )?.mediaUrl ||
              ""
            }
                        blured={false}
          />

        )}

      </div> */}
      <div className="w-full flex justify-center relative">

  {/* DARK OVERLAY + LOADER */}
  {isLoading && (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm 
                    flex flex-col items-center justify-center z-20">
      <Loader2 className="w-10 h-10 animate-spin text-white" />
      <p className="text-white text-sm font-medium mt-2">
        {resizeMessage}
      </p>
    </div>
  )}

  {/* MEDIA PREVIEW */}
  <MediaPreview
    key={props.post.mainId + props.selectedPlatform}
    media={
      props.resizedAspect[props.ratios[props.selectedPlatform]] ||
      props.updatedMedia[props.selectedPlatform] ||
      props.post.posts.find(
        (p) => p.platform.channel_type === props.selectedPlatform
      )?.mediaUrl ||
      ""
    }
    blured={isLoading} // blur only while loading
  />

</div>

    </div>
  );
}
