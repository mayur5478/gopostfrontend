"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, X } from "lucide-react";
import {
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaPlayCircle,
  FaGoogleDrive,
} from "react-icons/fa";
import classNames from "classnames";
import Image from "next/image";
import { useState, useEffect, Dispatch, SetStateAction } from "react";
import "react-datepicker/dist/react-datepicker.css";
import api from "@/lib/axios";
import { AGENT_URLS } from "@/lib/urls";
import { SchedulePicker } from "./SchedulePicker";
import { PostType } from "../../create/types";
import toast from "react-hot-toast";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import PostSetting from "@/app/(authenticated)/postsetting/PostSetting";

type props = {
  postDetails: PostType;
  posts: PostType[];
  onEdit: () => void;

  // ✅ ADDED: refresh callback (OPTIONAL)
  onRefresh?: () => Promise<void> | void;
};

export default function Post(props: props) {
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
    props.postDetails.posts.map((p) => (p.scheduleTime ? p.scheduleTime : ""))
  );

  const [time, setTime] = useState<string[]>(
    props.postDetails.posts.map((p) => getTimeFromDate(p.scheduleTime))
  );

  const [manualDate, setManualDate] = useState<string>("");
  const [manualTime, setManualTime] = useState<string>("");

  const [selectedPostForModal, setSelectedPostForModal] =
    useState<PostType>(props.postDetails);

  let iconElementsWithScheduleTime = (
    <div className="flex flex-col gap-1">
      {props.postDetails.posts.map((post, index) => {
        const scheduledTime = date[index];
        const iconClass = "flex w-fit gap-3 text-xs text-gray-500 items-center";
        const formattedTime = formatReadableDateTime(scheduledTime);

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

  let postDate;

  const handleScheduleConfirm = async (isoString: string) => {
    if (!props.postDetails.agent || !props.postDetails) {
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
      await api.patch(
        AGENT_URLS.PATCH_POST(
          props.postDetails.agent,
          props.postDetails.mainId
        ),
        payload
      );

      toast.success("Post scheduled successfully!");

      const newDate = new Date(isoString);
      const readableTime = newDate.toTimeString().slice(0, 5);

      setDate(props.postDetails.posts.map(() => isoString));
      setTime(props.postDetails.posts.map(() => readableTime));
      setManualDate(isoString);
      setManualTime(readableTime);

      // ✅ ADDED: refresh parent after scheduling
      if (props.onRefresh) {
        await props.onRefresh();
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Failed to schedule post. Please try again."
      );
    }
  };

  function formatReadableDateTime(isoString: string): string {
    if (!isoString || isoString == "") return "Not Scheduled Yet";
    try {
      const date = new Date(isoString);
      const day = date.getDate();
      const month = date.toLocaleString("en-US", { month: "long" });
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");

      return `${day} ${month}, ${year} - ${hours}:${minutes}`;
    } catch {
      return "Invalid Date";
    }
  }

  const getMediaType = (mediaUrl: string | undefined): boolean | undefined => {
    if (!mediaUrl) return;
    const lower = mediaUrl.toLowerCase();
    return [
      ".mp4",".mov",".ts",".avi",".mkv",".mpeg",
      ".wmv",".flv",".f4v",".3gp",".m4v",".m2ts",
      ".mpg",".ogv",".webm",".vob",".mxf",".mts",
    ].some((ext) => lower.includes(ext));
  };

  const isVideo = getMediaType(props.postDetails.mediaUrl);

  return (
    <div className="inline-flex w-full border-[#00000114] border-1 mt-2 rounded-md pl-1 pr-2">
      <div className="flex gap-2 items-center">
        <div className="relative w-[4rem] h-[4rem] rounded-lg m-[0.3rem]">
          {isVideo ? (
            <>
              <video
                src={props.postDetails.mediaUrl}
                className="w-full h-full object-cover"
                controls={false}
              />
              <FaPlayCircle className="absolute inset-0 m-auto h-6 w-6 text-white drop-shadow-lg" />
            </>
          ) : (
            <Image
              src={props.postDetails.mediaUrl || "undefinedUrl"}
              alt="Preview"
              width={50}
              height={50}
              className="object-cover w-full h-full"
            />
          )}
        </div>

        <div className="flex flex-col gap-2 p-1">
          <div className="inline-flex gap-2">
            <div className="postTitle max-w-[260px] break-words">
              {props.postDetails.posts[0].title}
            </div>
            <Badge
              variant="outline"
              className={classNames(
                "capitalize",
                props.postDetails.posts[0].status === "published" &&
                  "border-[#00C950] text-[#008236] bg-[#F0FDF4]",
                props.postDetails.posts[0].status.includes("scheduled") &&
                  "border-[#FEF186] text-[#A66000] bg-[#FEFCE8]"
              )}
            >
              {props.postDetails.posts[0].status}
            </Badge>
          </div>
          {iconElementsWithScheduleTime}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <SchedulePicker
          defaultDate={postDate}
          onConfirm={handleScheduleConfirm}
          manualDate={manualDate}
          manualTime={manualTime}
          setManualDate={setManualDate}
          setManualTime={setManualTime}
        />

        <Button
          variant="outline"
          className="bg-[#FDE047] rounded-2xl px-5"
          onClick={() => props.onEdit()}
        >
          Edit Details
        </Button>

        <Button variant="secondary" size="icon">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
