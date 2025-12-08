"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import { FaWandMagicSparkles } from "react-icons/fa6";
import { PostType } from "../../agents/create/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MEDIA_ENGINE_URLS } from "@/lib/urls";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import TextareaAutosize from "react-textarea-autosize";

type AspectRatio = "square" | "vertical" | "horizontal";
type props = {
  captions: Record<string, { start: string; end: string; text: string }[]>;
  setCaptions: Dispatch<
    SetStateAction<
      Record<string, { start: string; end: string; text: string }[]>
    >
  >;
  selectedPost: PostType;
  setSelectedPost: Dispatch<SetStateAction<PostType>>;
  ratios: Record<string, AspectRatio>;
  setRatios: Dispatch<SetStateAction<Record<string, AspectRatio>>>;
  selectedPlatform: string;
  setSelectedPlatform: Dispatch<SetStateAction<string>>;
  resizedAspect: Record<AspectRatio, string>;
  setResizedAspect: Dispatch<SetStateAction<Record<AspectRatio, string>>>;
  // selectedPlatform:string;
  updatedMedia:Record<string, string>;
  setUpdatedMedia:Dispatch<SetStateAction<Record<string,string>>>;
};
interface Caption {
  start: string;
  end: string;
  text: string;
}
export default function Captions(props: props) {
  const platforms = [
    // { id: 0, channel: "Content" },
    ...props.selectedPost.posts.map((post) => ({
      id: post.platform.id,
      channel: post.platform.channel_type,
    })),
  ];

  const [switchCaptions, setSwitchCaptions] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(platforms[0].channel);
  const [caps, setCaps] = useState<Caption[]>([]);
  // let videoUrl = props.selectedPost.mediaUrl;
  //select video from currently selected platform and its selected aspect ratio
  const videoUrl = props.resizedAspect[props.ratios[props.selectedPlatform]]||props.selectedPost.posts.find(p=>p.platform.channel_type===props.selectedPlatform)?.mediaUrl;
// YouTube-style formatter
const secondsToTimestamp = (input: number | string) => {
  // ensure we are working with a number
  const totalSeconds = Math.floor(Number(input) || 0);

  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    // H:MM:SS
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  // M:SS  (minutes is allowed to be 0 -> "0:05")
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};



  const handleGenerateCaptionWithAI = async () => {
    if (!videoUrl) {
      toast.error("No video URL found to generate captions.");
      return;
    }

    try {
      setIsLoading(true);
      // Reset captions before generation
      setCaps([]);

      const response = await api.post(MEDIA_ENGINE_URLS.TRANSCRIBE, {
        video_url: videoUrl,
        burn_captions: true,
      });

      const captionSegments = response?.data?.caption_segments;
      console.log("captionSegments", captionSegments);
      if (!captionSegments || !Array.isArray(captionSegments)) {
        throw new Error("Invalid transcription format received from server.");
      }

      // --- Map each segment to a caption object ---
      const generatedCaptions: Caption[] = captionSegments.map((seg: any) => {
        // start: secondsToTimestamp(seg.start),
        // end: secondsToTimestamp(seg.start + seg.duration),
        // text: seg.text.trim(),
         const startNum = Number(seg.start);
  const endNum = Number(seg.start) + Number(seg.duration);

  return {
    start: secondsToTimestamp(startNum),
    end: secondsToTimestamp(endNum),
    text: String(seg.text || "").trim(),
  }
      });

      // --- Store captions for ALL platforms ---
      // platforms.forEach((p) => {
      props.setCaptions((prev) => ({
        ...prev,
        [props.selectedPlatform.toLowerCase()]: generatedCaptions,
      }));
      // });
      console.log("generated capitons", generatedCaptions);

      //replace video url to new video url
      const Url = response.data.burned_video_s3.url;
      console.log("video url burnedoutput s3", Url);

      // add the video URl to resizedAspect array
      if(props.ratios[props.selectedPlatform]){
      props.setResizedAspect((prev) => ({
        ...prev,
        [props.ratios[props.selectedPlatform]]: Url,
      }));
    }
    else{
      props.setUpdatedMedia((prev)=>({
        ...prev,
        [props.selectedPlatform] : Url
      }))
    }


      // for (const post of props.selectedPost.posts) {
      //   const platformKey = post.platform.channel_type;
      //   if (platformKey === props.selectedPlatform) continue;

      //   const ratio = props.ratios[platformKey];
      //   try {
      //     const response = await api.post(MEDIA_ENGINE_URLS.TRANSCRIBE, {
      //       video_url: props.resizedAspect[props.ratios[platformKey]],
      //       burn_captions: true,
      //     });
      //     const Url = response.data.burned_video_s3.url;
      //     console.log("video url burnedoutput s3", platformKey, "     ", Url);
      //     props.setResizedAspect((prev) => ({
      //       ...prev,
      //       [props.ratios[platformKey]]: Url,
      //     }));
      //   } catch (err) {
      //     console.error(`Resize failed for ${platformKey}:`, err);
      //   }
      // }
    } catch (error: any) {
      console.error("Error generating captions:", error);
      toast.dismiss();
      toast.error(
        error.response?.data?.message ||
        "Failed to generate captions. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };
  const handleCaptionChange = (
    platform: string,
    index: number,
    newText: string
  ) => {
    props.setCaptions((prev) => {
      const updated = { ...prev };
      const platformCaptions = [...(updated[platform] || [])];
      platformCaptions[index] = { ...platformCaptions[index], text: newText };
      updated[platform] = platformCaptions;
      return updated;
    });
  };
  // const getMediaType = (mediaUrl: string | undefined): boolean | undefined => {
  //   if (!mediaUrl) return;

  //   const lower = mediaUrl.toLowerCase();
  //   const videoExtensions = [
  //     ".mp4", ".mov", ".ts", ".avi", ".mkv", ".mpeg",
  //     ".wmv", ".flv", ".f4v", ".3gp", ".m4v", ".m2ts",
  //     ".mpg", ".ogv", ".webm", ".vob", ".mxf", ".mts",
  //   ];
  //   if (videoExtensions.some((ext) => lower.includes(ext))) {
  //     return true;
  //   }
  //   if (lower.includes(".gif")) return false;
  //   return false;
  // };
  console.log("captions", props.captions);

  // const isVideo = getMediaType(props.selectedPost.mediaUrl);



  const key = props.selectedPlatform;//platforms.find(p=> p.channel===props.selectedPlatform)?.id || platforms[0].id;
  const platformCaptions = props.captions[key] || [];
  return (
    <>
      <div className="w-full flex justify-between gap-6">
        <div className="w-full h-full border border-gray-200 rounded-md p-3">
          <div className="w-full flex justify-between mb-2">
            <h3 className="text-lg font-semibold leading-[100%] tracking-[-0.21px] mb-2 text-[#000001E3]">
              Captions
            </h3>
            {/* <Switch
              checked={switchCaptions}
              onCheckedChange={setSwitchCaptions}
              className="data-[state=checked]:bg-[#FDE047]"
              disabled={!isVideo}
            /> */}
          </div>
          {/* Generate Caption With AI button */}
          <div className="w-full h-fit flex justify-center">
            <Button
              size="sm"
              variant="default"
              className="bg-gradient-to-r from-[#22D3EE] to-[#FFD600] text-white rounded-2xl px-4 py-2"
              onClick={handleGenerateCaptionWithAI}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FaWandMagicSparkles className="w-4 h-4 text-white" />
              )}
              {isLoading ? `Generating captions for ${props.selectedPlatform}...` : `Generate Captions with AI for ${props.selectedPlatform}`}
            </Button>
          </div>
          {/* Display caption from response here */}
          <div className="w-full">
            {/* <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full mt-3"
            >
              <TabsList className="flex border-b w-fit justify-start bg-transparent p-0 h-fit gap-3 ml-[1rem]">
                <TabsTrigger
                  key={key}
                  value={props.selectedPlatform}
                  className="pb-3 px-2 rounded-none border-b-2 border-transparent text-[#5B5B64]
                data-[state=active]:border-b-black data-[state=active]:text-black"
                >
                  {props.selectedPlatform}
                </TabsTrigger>
              </TabsList> */}

              {/* Captions Display per Tab */}
              {/* <TabsContent key={key} value={key}> */}
                <div className="mt-3 h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  {platformCaptions.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No captions generated yet.
                    </p>
                  ) : (
                    platformCaptions.map((cap, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {/* Timestamp box */}
                        <div className="flex-shrink-0 text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded-md w-[90px] text-center shadow-sm">
                          {cap.start} – {cap.end}
                        </div>
{/* <div className="flex-shrink-0 text-[10px] font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded-md w-[80px] text-center shadow-sm leading-tight">
  <div>{cap.start}</div>
  <div className="text-gray-400">→ {cap.end}</div>
</div> */}

                        {/* Caption text box */}
                        <div className="flex-1 text-sm text-gray-800  px-2 py-1 leading-snug">
                          <TextareaAutosize
                            value={cap.text}
                            onChange={(e:any) =>
                              handleCaptionChange(
                                key,
                                index,
                                e.target.value
                              )
                            }
                            className="w-full border-none bg-transparent resize-none text-sm text-gray-800 p-0 leading-tight focus:ring-0 focus:outline-none"
                            rows={1}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              {/* </TabsContent>
            </Tabs> */}
          </div>
        </div>
        <div></div>
      </div>
    </>
  );
}
