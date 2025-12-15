"use client";

import { Checkbox } from "@/components/ui/checkbox";
import React, { useRef, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import api from "@/lib/axios";
import { AgentData } from "../../../list/types";
import { AccountType, CarouselPostDetails } from "../../../create/types";
import { AGENT_URLS, CHANNEL_URL } from "@/lib/urls";
import CarouselPost from "../../Posts/CarouselPost";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import PostSettingForCarousel from "@/app/(authenticated)/postsetting/PostSettingForCarousel";
import { Loader2 } from "lucide-react";

// Props for the All component
type Props = {
  AgentData: AgentData;
  selectedCPosts: CarouselPostDetails[];
  setSelectedCPosts: React.Dispatch<React.SetStateAction<CarouselPostDetails[]>>;
      onRefresh: () => void;  
        refreshKey: number;

};

export default function CarouselAll(props: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [carouselPosts, setCarouselPosts] = useState<CarouselPostDetails[]>([]);

  const { selectedCPosts, setSelectedCPosts } = props;
  const [openPostSetting, setOpenPostSetting] = useState(false);
  const [clickedPost, setClickedPost] = useState<CarouselPostDetails | null>(null);

  useEffect(() => {
    async function fetchPostsOfAnAgent() {
      setLoading(true);
      try {
        const channelResponse = await api.get(CHANNEL_URL.GET_CHANNEL);
        const channels = channelResponse.data.results;

        const { data } = await api.get(
          AGENT_URLS.POSTS(props.AgentData.id)
        );

        if (!data || !data.results) {
          console.log("No results found in API response.");
          setCarouselPosts([]);
          return;
        }

        // Map MasterPosts to CarouselPostDetails
        const allCarouselPosts: CarouselPostDetails[] = (await Promise.all(
          data.results.map(
            (async (masterPost: any) => {
              if (!masterPost || !masterPost.channel_posts) return null;

              // 1. Process inner posts first to get their media URLs
              const posts = await Promise.all(
                masterPost.channel_posts.map(async (post: any) => {
                  const platform = channels.find(
                    (ch: AccountType) => ch.id == post.channel
                  );

                  return {
                    postId: post.post_id,
                    title: post.title,
                    allMediaUrls: post.metadata.media_urls || [],
                    status: post.status,
                    caption: Array.isArray(post.caption)
                      ? post.caption
                      : [post.caption || ""],
                    tags: Array.isArray(post.tags)
                      ? post.tags
                      : [post.tags || ""],
                    thumbnailUrl: post.thumbnail_url,
                    resize: post.resize,
                    metadata: post.metadata,
                    scheduleTime: post.scheduled_time || null,
                    date: post.updated_at,
                    platform: platform || null,
                  };
                })
              );

              // 2. Fix White Box: If masterPost doesn't have original_media_url, 
              // fallback to the first image from the first inner post.
              let primaryUrl = masterPost.original_media_url;
              if (!primaryUrl && posts.length > 0 && posts[0].allMediaUrls?.length > 0) {
                primaryUrl = posts[0].allMediaUrls[0];
              }

              return {
                mainId: masterPost.id,
                agent: masterPost.agent,
                firstMediaUrl: primaryUrl || "", // This ensures CarouselPost gets a valid URL
                posts: posts
              };
            })
          ))).filter((post: CarouselPostDetails | null): post is CarouselPostDetails => post !== null);

        setCarouselPosts(allCarouselPosts);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
        setCarouselPosts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPostsOfAnAgent();
  }, [props.AgentData.id, props.AgentData.destinationPlatforms]);

  const toggleSelect = (post: CarouselPostDetails) => {
    setSelectedCPosts((prevSelected) => {
      const isSelected = prevSelected.some(
        (p) => p.mainId === post.mainId
      );
      if (isSelected) {
        return prevSelected.filter((p) => p.mainId !== post.mainId);
      } else {
        return [...prevSelected, post];
      }
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCPosts(carouselPosts);
    } else {
      setSelectedCPosts([]);
    }
  };

  const allSelected =
    carouselPosts.length > 0 &&
    selectedCPosts.length === carouselPosts.length;

  const handleEditClick = (post: CarouselPostDetails) => {
    console.log("AllPostFromComp: opening modal for", post.mainId);
    setClickedPost(post);
    setOpenPostSetting(true);
  };

  if (loading)
    return (
<div className="w-full flex-1 flex flex-col justify-center items-center text-xl text-gray-600 animate-fadeIn">
  <Loader2 className="h-10 w-10 animate-spin text-[#FDE047] mb-3" />
  <p className="text-base animate-pulse">Getting all posts...</p>
</div>

    );
  return (
    <div className="allContent flex flex-col w-full p-[1.3rem]">
      <div className="flex gap-3 w-full mb-3 items-center border-b pb-3">
        <Checkbox
          className="border-2 border-[#E1E4EA]"
          id="selectAll"
          checked={allSelected}
          onCheckedChange={(checked) => toggleSelectAll(!!checked)}
          aria-label="Select all posts"
        />
        <Label htmlFor="selectAll" className="cursor-pointer text-sm font-medium">
          Select All ({selectedCPosts.length} selected)
        </Label>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {carouselPosts.length === 0 && !loading && (
          <p className="text-center text-gray-500 mt-6">No posts found for this agent.</p>
        )}
        {carouselPosts.map((card: CarouselPostDetails) => {
          const isChecked = selectedCPosts.some(
            (p) => p.mainId === card.mainId
          );
          return (
            <div key={card.mainId} className="flex items-center space-x-3 w-full">
              <Checkbox
                className="border-2 border-[#E1E4EA]"
                id={card.mainId}
                checked={isChecked}
                onCheckedChange={() => toggleSelect(card)}
                aria-label={`Select post ${card.posts[0].title}`}
              />
              <Label
                htmlFor={card.mainId}
                className="cursor-pointer w-full"
              >
                <CarouselPost postDetails={card} onEdit={() => handleEditClick(card)}
                  key={`${card.mainId}-${refreshKey}`} />
              </Label>
            </div>
          );
        })}
      </div>

      <Dialog open={openPostSetting} onOpenChange={setOpenPostSetting}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/30 z-40" />
          {/* UPDATED CONTAINER STYLE TO MATCH STANDARD POST SETTINGS */}
          <div
            className="fixed inset-0 w-screen h-screen bg-white shadow-lg overflow-y-auto z-50 animate-in slide-in-from-bottom-10"
          >
            {/* We don't need a manual close button here if PostSettingForCarousel has one, 
                    but passing onClose handles it properly. */}
            {clickedPost ? (<PostSettingForCarousel
              carouselPost={clickedPost}
              onClose={() => setOpenPostSetting(false)}
              onSave={() => props.onRefresh()}   // new line
            />) : (<div className="p-6">No post selected</div>
            )}
          </div>
        </DialogPortal>
      </Dialog>
    </div>
  );
}