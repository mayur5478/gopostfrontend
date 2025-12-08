"use client";

import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import api from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import PostSettingForCarousel from "@/app/(authenticated)/postsetting/PostSettingForCarousel";
import { X, ChevronDown, ChevronUp, MoreHorizontal, CalendarClock, Loader2 } from "lucide-react"; 
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"; 
import { FaFacebook, FaInstagram, FaLinkedin, FaYoutube, FaPlayCircle, FaGoogleDrive } from "react-icons/fa";
import Image from "next/image"; 
import { Button } from "@/components/ui/button"; 
import { Badge } from "@/components/ui/badge"; 
import classNames from "classnames"; 
import { SchedulePicker } from "./SchedulePicker"; 
import { AGENT_URLS, CHANNEL_URL } from "@/lib/urls"; 
import { CarouselPostDetails } from "../../create/types";
import toast from "react-hot-toast";

async function fetchPresignedUrl(fileKey: string, expirationMinutes: number = 30): Promise<string> {
  if (!fileKey || !isFileKey(fileKey)) {
    return fileKey; 
  }
  try {
    const response = await api.get(CHANNEL_URL.S3_PRESIGNED_DOWNLOAD_URL, {
      params: {
        file_key: fileKey,
        expiration_minutes: expirationMinutes
      }
    });
    return response.data.download_url;
  } catch (error) {
    console.error(`Failed to fetch presigned URL for ${fileKey}:`, error);
    return fileKey; 
  }
}

function isFileKey(url: string): boolean {
  return !!url && (url.startsWith("uploads/") || !url.includes("://"));
}

type props = {
  postDetails: CarouselPostDetails;
};

export default function CarouselPost(props: props) {
  const [isFetchingUrls, setIsFetchingUrls] = useState(true);
  const [displayFirstMediaUrl, setDisplayFirstMediaUrl] = useState<string>("");
  const [displayAllMediaUrls, setDisplayAllMediaUrls] = useState<string[]>([]);
  const [manualDate, setManualDate] = useState<string>("");
  const [manualTime, setManualTime] = useState<string>("");

  useEffect(() => {
    const fetchUrls = async () => {
      setIsFetchingUrls(true);
      const firstUrl = await fetchPresignedUrl(props.postDetails.firstMediaUrl);
      setDisplayFirstMediaUrl(firstUrl);

      if (props.postDetails.posts?.[0]?.allMediaUrls) {
        const allUrls = await Promise.all(
          props.postDetails.posts[0].allMediaUrls.map(url => fetchPresignedUrl(url))
        );
        setDisplayAllMediaUrls(allUrls);
      } else {
        setDisplayAllMediaUrls([firstUrl]);
      }
      setIsFetchingUrls(false);
    };

    fetchUrls();
  }, [props.postDetails]);

  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});

  const toggleCollapsible = (masterPostId: string) => {
    setOpenCollapsibles(prev => ({ ...prev, [masterPostId]: !prev[masterPostId] }));
  };

  const getTimeFromDate = (isoString?: string | null) => {
    if (!isoString) return "Not Scheduled Yet";
    try {
      const date = new Date(isoString);
      return date.toTimeString().slice(0, 5); 
    } catch {
      return "Not Scheduled Yet";
    }
  };  

  const [date, setDate] = useState<string[]>(
    props.postDetails.posts?.map((p) =>
      p.scheduleTime ? p.scheduleTime : ""
    ) || []
  );

  const [time, setTime] = useState<string[]>(
    props.postDetails.posts?.map((p) => getTimeFromDate(p.scheduleTime)) || []
  );

  const [openPostSetting, setOpenPostSetting] = useState(false);

  const iconElementsWithScheduleTime = (
    <div className="flex flex-col gap-1">
      {props.postDetails.posts?.map((post, index) => {
        const scheduledTime = date[index]; 
        const iconClass = "flex w-fit gap-3 text-xs text-gray-500 items-center";
        const formattedTime = formatReadableDateTime(scheduledTime);

        if (!post.platform) return null;

        switch (post.platform.channel_type) {
          case "google":
            return (
              <div key={post.postId} className={iconClass}>
                <FaGoogleDrive className="h-3 w-3 text-green-600" />
                {formattedTime}
              </div>
            );
          case "instagram":
            return (
              <div key={post.postId} className={iconClass}>
                <FaInstagram className="h-3 w-3 text-pink-500" />
                {formattedTime}
              </div>
            );
          case "linkedin":
            return (
              <div key={post.postId} className={iconClass}>
                <FaLinkedin className="h-3 w-3 text-blue-600" />
                {formattedTime}
              </div>
            );
          case "youtube":
            return (
              <div key={post.postId} className={iconClass}>
                <FaYoutube className="h-3 w-3 text-red-600" />
                {formattedTime}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );

  function formatReadableDateTime(isoString: string): string {
    if (!isoString || isoString=="") return "Not Scheduled Yet";
    try {
      const date = new Date(isoString);
      const day = date.getDate();
      const month = date.toLocaleString("en-US", { month: "long" });
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${day} ${month}, ${year} - ${hours}:${minutes}`;
    } catch (error) {
      console.error("Invalid ISO date:", isoString, error);
      return "Invalid Date";
    }
  }

  const handleScheduleConfirm = async (isoString: string) => {
    if (!props.postDetails.agent || !props.postDetails) {
      toast.error("Cannot schedule: Missing Agent or Post ID.");
      return;
    }

    const payload = {
      id: props.postDetails.mainId,
      agent: props.postDetails.agent,
      channel_posts: props.postDetails.posts.map((post) => ({
        post_id: post.postId,
        scheduled_time: isoString,
        channel: post.platform.id,
      })),
    };

    try {
      const response = await api.patch(
        AGENT_URLS.PATCH_POST(
          props.postDetails.agent,
          props.postDetails.mainId
        ),
        payload,
        { headers: { "Content-Type": "application/json" } }
      );
      toast.success("Post scheduled successfully!");
      const newDate = new Date(isoString);
      const readableTime = newDate.toTimeString().slice(0, 5); 

      setDate(props.postDetails.posts.map(() => isoString));
      setTime(props.postDetails.posts.map(() => readableTime));
      setManualDate(isoString);
      setManualTime(readableTime);

    } catch (error: any) {
      console.error(" Error scheduling:", error);
      toast.error(error.response?.data?.message || "Failed to schedule post.");
    }
  };

  const getMediaType = (mediaUrl: string | undefined): boolean | undefined => {
    if (!mediaUrl) return;
    const lower = mediaUrl.toLowerCase();
    const videoExtensions = [".mp4", ".mov", ".webm", ".avi", ".mkv", ".wmv", ".flv", ".f4v", ".3gp", ".m4v", ".mpeg", ".mpg", ".mts", ".m2ts", ".ogv", ".ts", ".vob", ".mxf"];
    if (videoExtensions.some(ext => lower.includes(ext))) return true;
    if (lower.includes(".gif")) return false;
    return false; 
  };

  let isVideo = getMediaType(displayFirstMediaUrl); 
  const representativePost = props.postDetails.posts?.[0];

  if (!representativePost) {
    return null;
  }

  return (        
    <Collapsible
      open={openCollapsibles[props.postDetails.mainId] || false}
      onOpenChange={() => toggleCollapsible(props.postDetails.mainId)}
      className="flex-1 min-w-0"
    >
      <div className="inline-flex w-full border border-[#00000114] mt-2 rounded-md pl-1 pr-2">
        <div className="flex gap-2 items-center flex-1 min-w-0 cursor-pointer" onClick={() => toggleCollapsible(props.postDetails.mainId)}>
          <div className=" relative w-16 h-16 rounded-md m-[0.3rem] flex-shrink-0 overflow-hidden bg-gray-100">
            {isFetchingUrls ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : isVideo ? (
              <>
                <video src={displayFirstMediaUrl} className="w-full h-full object-cover" controls={false} muted playsInline />
                <FaPlayCircle className="absolute inset-0 m-auto h-6 w-6 text-white drop-shadow-lg" />
              </>
            ) : (
              <Image
                src={displayFirstMediaUrl || "/placeholder-image.png"}
                alt="Preview"
                width={64}
                height={64}
                className="object-cover w-full h-full"
                onError={(e) => { e.currentTarget.src = '/placeholder-image.png'; }}
              />
            )}                          
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="inline-flex gap-2 items-center">
              <div className="postTitle font-medium truncate text-sm">{representativePost.title}</div>
              <Badge
                variant="outline"
                className={classNames(
                  "w-fit h-fit px-1.5 py-0.5 font-medium rounded text-[9px] flex items-center justify-center leading-none capitalize",
                  representativePost.status === "published" && "border-[#00C950] text-[#008236] bg-[#F0FDF4]",
                  representativePost.status?.includes("scheduled") && "border-[#FEF186] text-[#A66000] bg-[#FEFCE8]",
                  representativePost.status === "failed" && "border-[#FF6467] text-[#E7000B] bg-[#FEF2F2]",
                  representativePost.status === "pending" && "border-gray-300 text-gray-600 bg-gray-100"
                )}
              >
                {representativePost.status}
              </Badge>
              {iconElementsWithScheduleTime}
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-shrink-0 pr-2">
          <div onClick={(e) => e.stopPropagation()}>
            <SchedulePicker
              defaultDate={date[0]}
              onConfirm={handleScheduleConfirm}
              manualDate={manualDate}
              manualTime={manualTime}
              setManualDate={setManualDate}
              setManualTime={setManualTime}
            />
          </div>
          <Button
            variant="outline"
            className="editDetails bg-[#FDE047] rounded-lg px-3 text-xs h-8 hover:bg-[#FDE047]/90 text-black"
            onClick={(e) => {
              e.stopPropagation(); 
              setOpenPostSetting(true);
            }}
          >
            Edit Details
          </Button>

          <Button
            variant="secondary" size="icon" className="more rounded-full bg-gray-100 w-8 h-8 hover:bg-gray-200"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <MoreHorizontal className="h-4 w-4 text-gray-600" />
          </Button>

          <Dialog open={openPostSetting} onOpenChange={setOpenPostSetting}>
            <DialogPortal>
              <DialogOverlay className="fixed inset-0 bg-black/30 z-40" />
              {/* UPDATED CONTAINER STYLE TO MATCH STANDARD POST SETTINGS */}
              <div
                className="fixed inset-0 w-screen h-screen bg-white shadow-lg overflow-y-auto z-50 animate-in slide-in-from-bottom-10"
              >
                {/* We don't need a manual close button here if PostSettingForCarousel has one, 
                    but passing onClose handles it properly. */}
                <PostSettingForCarousel 
                    carouselPost={props.postDetails} 
                    onClose={() => setOpenPostSetting(false)}
                />
              </div>
            </DialogPortal>
          </Dialog>

          {displayAllMediaUrls.length > 1 && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-gray-100">
                {openCollapsibles[props.postDetails.mainId] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
      </div>

      <CollapsibleContent className="px-4 pb-3 pt-2 bg-gray-50 border-t border-gray-100 animate-in fade-in duration-200">
        <p className="text-xs font-medium text-gray-500 mb-2">Carousel Media ({displayAllMediaUrls.length})</p>
        <div className="flex flex-wrap gap-2">
          {isFetchingUrls ? (
            <div className="w-14 h-14 rounded-md flex items-center justify-center bg-gray-200">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            displayAllMediaUrls.map((url, index) => {
              const isChildVideo = getMediaType(url);
              return (
                <div key={`${props.postDetails.mainId}-img-${index}`} className="relative w-14 h-14 rounded overflow-hidden border bg-gray-200">
                  {isChildVideo ? (
                    <>
                      <video src={url} className="w-full h-full object-cover" controls={false} muted playsInline />
                      <FaPlayCircle className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-lg" />
                    </>
                  ) : (
                    <Image
                      src={url ? url : "/placeholder-image.png"}
                      alt={`Preview ${index + 1}`}
                      width={50}
                      height={50}
                      className="object-cover w-full h-full"
                      onError={(e) => { e.currentTarget.src = '/placeholder-image.png'; }}
                    />
                  )}                                  
                </div>
              );
            })
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}