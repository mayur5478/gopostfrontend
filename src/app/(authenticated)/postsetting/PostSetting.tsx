"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaPlayCircle,
  FaGoogleDrive,
} from "react-icons/fa";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Metadata from "./postSettingTabs/Metadata";
import Captions from "./postSettingTabs/Captions";
import Thumbnail from "./postSettingTabs/Thumbnail";
import Image from "next/image";
import { useEffect, useState } from "react";
import { PostType } from "../agents/create/types";
import PreviewPanel from "./PreviewPanel";
import api from "@/lib/axios";
import { AGENT_URLS, CHANNEL_URL, MEDIA_ENGINE_URLS } from "@/lib/urls";
import toast from "react-hot-toast";

type Props = {
  post: PostType;
  posts: PostType[];
  onClose: () => void;
};

type AspectRatio = "square" | "vertical" | "horizontal";

async function fetchPresignedUrl(
  fileKey: string,
  expirationMinutes: number = 30
): Promise<string> {
  try {
    const response = await api.get(CHANNEL_URL.S3_PRESIGNED_DOWNLOAD_URL, {
      params: { file_key: fileKey, expiration_minutes: expirationMinutes },
    });
    return response.data.download_url;
  } catch (error) {
    return fileKey;
  }
}

function isFileKey(url: string): boolean {
  return (
    url.startsWith("uploads/") ||
    !url.includes("://") ||
    url.startsWith("ai-thumbnails/")
  );
}

// true => video, false => image
const getMediaType = (post: PostType | undefined): boolean => {
  if (!post) return false;

  const metaType = (post.posts[0]?.metadata as any)?.mediaType;
  if (metaType && metaType.startsWith("video")) return true;

  if (!post.mediaUrl) return false;
  const lower = post.mediaUrl.toLowerCase();
  const videoExtensions = [
    ".mp4",
    ".mov",
    ".ts",
    ".avi",
    ".mkv",
    ".mpeg",
    ".wmv",
    ".flv",
    ".f4v",
    ".3gp",
    ".m4v",
    ".m2ts",
    ".mpg",
    ".ogv",
    ".webm",
    ".vob",
    ".mxf",
    ".mts",
  ];
  return videoExtensions.some((ext) => lower.includes(ext));
};

export default function PostSetting({ post, posts, onClose }: Props) {
  const platforms = post.posts.map((p: any) => ({
    id: p.platform.id,
    name:
      p.platform.channel_type.charAt(0).toUpperCase() +
      p.platform.channel_type.slice(1),
    channel: p.platform.channel_type, // e.g. "linkedin"
    icon:
      p.platform.channel_type === "facebook"
        ? FaFacebook
        : p.platform.channel_type === "linkedin"
        ? FaLinkedin
        : null,
  }));

  const [selectedPost, setSelectedPost] = useState<PostType>(post);
  const [allPosts] = useState<PostType[]>(posts);

  const [resizedAspect, setResizedAspect] = useState<
    Record<AspectRatio, string>
  >({
    square: "",
    vertical: "",
    horizontal: "",
  });

  const [updatedMedia, setUpdatedMedia] = useState<Record<string, string>>({});

  const [ratios, setRatios] = useState<Record<string, AspectRatio>>(
    Object.fromEntries(platforms.map((p: any) => [p.channel, "square"]))
  );
  const [selectedPlatform, setSelectedPlatform] = useState<string>(
    platforms[0]?.channel || "linkedin"
  );

  const isVideo = getMediaType(selectedPost);

  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [metadataTitle, setMetadataTitle] = useState<Record<string, string>>(
    {}
  );
  const [metadataDesc, setMetadataDesc] = useState<Record<string, string>>({});
  const [metadataContent, setMetadataContent] = useState<{
    title: string;
    description: string;
    tags: string[];
  }>({ title: "", description: "", tags: [] });
  const [hashtags, setHashtags] = useState<Record<string, string[]>>({});
  const [captions, setCaptions] = useState<Record<string, any[]>>({});
  const [resizedThumbnails, setResizedThumbnails] = useState<
    Record<string, string>
  >({});

  // per-media flag → kis mainId par API already ho chuka hai
  const [analyzedPosts, setAnalyzedPosts] = useState<Record<string, boolean>>(
    {}
  );

  // --------- LOAD DATA FROM BACKEND FOR CURRENT SELECTED POST ----------
  const settingData = () => {
    if (!selectedPost) return;

    const newTitles: Record<string, string> = {};
    const newDescs: Record<string, string> = {};
    const newTags: Record<string, string[]> = {};
    const newPrompts: Record<string, string> = {};
    const newResizedThumbnails: Record<string, string> = {};
    let newThumbnail: string | null = null;
    let newMetadataContent = {
      title: "",
      description: "",
      tags: [] as string[],
    };

    selectedPost.posts.forEach((p) => {
      const platformKey = p.platform?.channel_type?.toLowerCase();
      if (!platformKey) return;

      if (p.title) newTitles[platformKey] = p.title;
      if (p.metadata?.description)
        newDescs[platformKey] = p.metadata.description as string;

      if ((p.metadata as any)?.ai_prompt)
        newPrompts["content"] = (p.metadata as any).ai_prompt as string;

      if (p.tags) newTags[platformKey] = p.tags;
      if (p.content)
        newMetadataContent = p.content as {
          title: string;
          description: string;
          tags: string[];
        };

      if (p.thumbnailUrl) {
        newThumbnail = p.thumbnailUrl;
        newResizedThumbnails[platformKey] = p.thumbnailUrl;
      }
    });

    // 🔥 important: Content tab ko bhi fill karo ek master view ke liye
    const anyKey =
      Object.keys(newTitles)[0] ||
      Object.keys(newDescs)[0] ||
      Object.keys(newTags)[0];

    if (anyKey) {
      if (!newTitles["content"])
        newTitles["content"] = newTitles[anyKey] || "";
      if (!newDescs["content"])
        newDescs["content"] = newDescs[anyKey] || "";
      if (!newTags["content"]) newTags["content"] = newTags[anyKey] || [];
    }

    setMetadataTitle(newTitles);
    setMetadataDesc(newDescs);
    setMetadataContent(newMetadataContent);
    setHashtags(newTags);
    setPrompts(newPrompts);
    if (newThumbnail) setThumbnail(newThumbnail);
    setResizedThumbnails(newResizedThumbnails);

    // agar backend se meta aa gaya hai → is media ke liye API fir se mat chalana
    const first = selectedPost.posts[0];
    const meta = (first?.metadata || {}) as any;
    const hasExisting =
      !!meta.ai_prompt ||
      !!meta.description ||
      (Array.isArray(first?.tags) && first.tags.length > 0);

    if (hasExisting) {
      setAnalyzedPosts((prev) => ({
        ...prev,
        [String(selectedPost.mainId)]: true,
      }));
    }
  };

  useEffect(() => {
    if (selectedPost) settingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPost.mainId]);

  // --------- AUTO ANALYZE – ONLY ONCE PER MEDIA ----------
  useEffect(() => {
    const analyzeMedia = async () => {
      if (!selectedPost) return;

      const mediaUrl = selectedPost.mediaUrl;
      if (!mediaUrl || mediaUrl.startsWith("blob:")) return;

      const key = String(selectedPost.mainId);

      // already analyzed in this session?
      if (analyzedPosts[key]) return;

      // extra safety: agar backend me meta hai toh skip
      const firstPost = selectedPost.posts[0];
      const meta = (firstPost?.metadata || {}) as any;
      const hasExisting =
        !!meta.ai_prompt ||
        !!meta.description ||
        (Array.isArray(firstPost?.tags) && firstPost.tags.length > 0);

      if (hasExisting) {
        setAnalyzedPosts((prev) => ({ ...prev, [key]: true }));
        return;
      }

      setIsAnalyzing(true);

      try {
        const { data } = await api.post(MEDIA_ENGINE_URLS.ANALYZE_MEDIA_URL, {
          media_url: mediaUrl,
          media_type: "auto",
          tone: "professional",
          platform: "any",
          prompt_hint: "",
        });

        if (data) {
          if (data.generated_prompt) {
            setPrompts((prev) => ({
              ...prev,
              content: data.generated_prompt as string,
            }));
          }

          // video thumbnail
          if (data.thumbnail_url && getMediaType(selectedPost)) {
            setThumbnail(data.thumbnail_url);
            const keys = platforms.map((p: any) =>
              p.channel.toLowerCase()
            ) as string[];
            setResizedThumbnails((prev) => {
              const n = { ...prev };
              keys.forEach((k) => {
                n[k] = data.thumbnail_url;
              });
              return n;
            });
          }

          if (data.metadata) {
            const platformKeys = platforms.map((p: any) =>
              p.channel.toLowerCase()
            ) as string[];
            const keys = ["content", ...platformKeys];

            const rawDesc = data.metadata.description || "";
            const tags: string[] = data.metadata.hashtags || [];
            const combinedDesc =
              tags.length > 0 ? `${rawDesc}\n\n${tags.join(" ")}` : rawDesc;

            setMetadataTitle((prev) => {
              const n = { ...prev };
              keys.forEach((k) => {
                n[k] = data.metadata.title || "";
              });
              return n;
            });

            setMetadataDesc((prev) => {
              const n = { ...prev };
              keys.forEach((k) => {
                n[k] = combinedDesc;
              });
              return n;
            });

            setHashtags((prev) => {
              const n = { ...prev };
              keys.forEach((k) => {
                n[k] = tags;
              });
              return n;
            });

            setMetadataContent({
              title: data.metadata.title || "",
              description: combinedDesc,
              tags,
            });
          }

          setAnalyzedPosts((prev) => ({ ...prev, [key]: true }));
          toast.success("Analysis complete!");
        }
      } catch (e) {
        console.error(e);
        toast.error("Auto-generation failed.");
      } finally {
        setIsAnalyzing(false);
      }
    };

    if (selectedPost) {
      const t = setTimeout(analyzeMedia, 700);
      return () => clearTimeout(t);
    }
  }, [selectedPost, platforms, analyzedPosts]);

  // --------- SAVE CHANGES ----------
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const payload = {
        id: selectedPost.mainId,
        agent: selectedPost.agent,
        channel_posts: selectedPost.posts.map((p) => {
          const platformKey = p.platform?.channel_type || "";
          const ratio = ratios[platformKey];

          return {
            post_id: p.postId,
            channel: p.platform?.id ?? null,
            title: metadataTitle[platformKey.toLowerCase()] || "",
            metadata: {
              description: metadataDesc[platformKey.toLowerCase()] || "",
              ai_prompt: prompts["content"] || "",
            },
            tags: hashtags[platformKey.toLowerCase()] || [],
            caption: captions[platformKey.toLowerCase()] || [],
            thumbnail_url:
              resizedThumbnails[platformKey.toLowerCase()] || thumbnail,
            resize: ratio,
            media_url:
              resizedAspect[ratio] ||
              updatedMedia[platformKey.toLowerCase()] ||
              p.mediaUrl,
            content: metadataContent,
          };
        }),
      };

      await api.put(
        AGENT_URLS.PATCH_POST(selectedPost.agent, selectedPost.mainId),
        payload
      );
      toast.success("Saved!");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update post.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="w-full pt-1 pr-6 pb-3 pl-3 items-center justify-between">
        {/* HEADER */}
        <div className="flex items-center gap-1 w-full border-b border-gray-200 pt-1 pr-6 pb-1 pl-3">
          <div className="flex flex-col gap-2 w-fit h-fit">
            <div className="inline-block font-semibold text-[18px] leading-[100%] tracking-[-0.21px]">
              Post Settings
            </div>
          </div>
          <div className="ml-auto p-1 flex items-center justify-center w-fit">
            <Button
              variant="outline"
              className="text-gray-700 rounded-2xl mr-3"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={handleSaveChanges}
              className={`rounded-2xl flex items-center gap-2 px-4 transition-all ${
                isSaving
                  ? "bg-[#FDE047]/70 cursor-not-allowed"
                  : "bg-[#FDE047] hover:bg-[#FDE047]/90"
              }`}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-8 h-8 rounded-full"
          >
            <X className="w-10 h-10 text-black" />
          </Button>
        </div>

        {/* MEDIA STRIP */}
        <div className="p-4 w-full">
          <div className="p-1 gap-2 flex flex-wrap">
            {[selectedPost,
              ...allPosts.filter((p) => p.mainId !== selectedPost.mainId),
            ].map((p) => {
              const isVideoItem = getMediaType(p);
              const isSelected = p.mainId === selectedPost.mainId;
              const key = String(p.mainId);
              const isAnalyzedFlag = analyzedPosts[key];

              return (
                <div
                  key={p.mainId}
                  onClick={() => {
                    setSelectedPost(p);
                  }}
                  className={`relative w-[56px] h-[56px] rounded-md flex items-center justify-center cursor-pointer transition-all ${
                    isSelected
                      ? "border-2 border-[#FDE047]"
                      : "border border-gray-200 hover:border-[#FDE047]/70"
                  }`}
                >
                  <div className="relative w-[50px] h-[50px] rounded-md overflow-hidden bg-gray-100">
                    {isVideoItem ? (
                      <>
                        <video
                          src={p.mediaUrl || ""}
                          className="object-cover w-full h-full opacity-70"
                        />
                        <FaPlayCircle className="absolute inset-0 m-auto h-6 w-6 text-white drop-shadow-lg" />
                      </>
                    ) : (
                      <Image
                        src={p.mediaUrl || "/placeholder.png"}
                        alt="Preview"
                        width={50}
                        height={50}
                        className="object-cover w-full h-full"
                      />
                    )}
                  </div>

                  {isAnalyzedFlag && (
                    <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-green-500 border border-white" />
                  )}
                </div>
              );
            })}
          </div>

          {/* BODY */}
          <div className="mt-6 flex gap-6">
            {/* LEFT SIDE – TABS */}
            <div className="w-1/2">
              <Tabs defaultValue="Metadata">
                <TabsList>
                  <TabsTrigger value="Metadata">Metadata</TabsTrigger>
                  {isVideo && (
                    <TabsTrigger value="Thumbnail">Thumbnail</TabsTrigger>
                  )}
                  {isVideo && (
                    <TabsTrigger value="Captions">Captions</TabsTrigger>
                  )}
                </TabsList>
                <div className="mt-4">
                  <TabsContent value="Metadata">
                    <Metadata
                      post={selectedPost}
                      metadataTitle={metadataTitle}
                      setMetadataTitle={setMetadataTitle}
                      metadataDesc={metadataDesc}
                      setMetadataDesc={setMetadataDesc}
                      hashtags={hashtags}
                      setHashtags={setHashtags}
                      metadataContent={metadataContent}
                      setMetadataContent={setMetadataContent}
                      prompts={prompts}
                      setPrompts={setPrompts}
                    />
                  </TabsContent>

                  <TabsContent value="Thumbnail">
                    <Thumbnail
                      thumbnail={thumbnail}
                      setThumbnail={setThumbnail}
                      ratios={ratios}
                      resizedThumbnails={resizedThumbnails}
                      setResizedThumbnails={setResizedThumbnails}
                      selectedPost={selectedPost}
                      setSelectedPost={setSelectedPost}
                      selectedPlatform={selectedPlatform}
                      autoPrompt={prompts["content"]}
                    />
                  </TabsContent>

                  <TabsContent value="Captions">
                    <Captions
                      captions={captions}
                      setCaptions={setCaptions}
                      selectedPost={selectedPost}
                      setSelectedPost={setSelectedPost}
                      resizedAspect={resizedAspect}
                      setResizedAspect={setResizedAspect}
                      ratios={ratios}
                      setRatios={setRatios}
                      selectedPlatform={selectedPlatform}
                      setSelectedPlatform={setSelectedPlatform}
                      updatedMedia={updatedMedia}
                      setUpdatedMedia={setUpdatedMedia}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* RIGHT SIDE – PREVIEW */}
            <PreviewPanel
              key={selectedPost.mainId}
              post={selectedPost}
              ratios={ratios}
              setRatios={setRatios}
              selectedPlatform={selectedPlatform}
              setSelectedPlatform={setSelectedPlatform}
              resizedAspect={resizedAspect}
              setResizedAspect={setResizedAspect}
              updatedMedia={updatedMedia}
              setUpdatedMedia={setUpdatedMedia}
            />
          </div>
        </div>
      </div>

      {/* ANALYSIS LOADER */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-[9999]">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center border border-gray-100">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#FDE047] blur-xl opacity-30 rounded-full animate-pulse" />
              <Loader2 className="w-12 h-12 animate-spin text-[#FDE047] relative z-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Analyzing Media
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Generating title, description, hashtags and prompt...
            </p>
            <div className="mt-6 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-[#FDE047] w-full origin-left animate-progress" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
