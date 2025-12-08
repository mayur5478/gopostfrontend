"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import Image from "next/image";
import { X, Loader2 } from "lucide-react";
import { FaFacebook, FaLinkedin, FaPlayCircle } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import Metadata from "./postSettingTabs/Metadata";
import Captions from "./postSettingTabs/Captions";
import Thumbnail from "./postSettingTabs/Thumbnail";
import PreviewPanel from "./PreviewPanel";

import api from "@/lib/axios";
import { AGENT_URLS, CHANNEL_URL, MEDIA_ENGINE_URLS } from "@/lib/urls";
import toast from "react-hot-toast";
import { CarouselPostDetails, PostType } from "../agents/create/types";

type AspectRatio = "square" | "vertical" | "horizontal";

interface SlideAnalysisData {
  title: string;
  description: string;
  hashtags: string[];
  prompt: string;
  thumbnailUrl?: string | null;
  isAnalyzed: boolean;
}

type Props = {
  carouselPost: CarouselPostDetails;
  onClose: () => void;
};

async function fetchPresignedUrl(
  fileKey: string,
  expirationMinutes: number = 1440
): Promise<string> {
  if (!fileKey || !isFileKey(fileKey)) return fileKey;
  try {
    const response = await api.get(CHANNEL_URL.S3_PRESIGNED_DOWNLOAD_URL, {
      params: { file_key: fileKey, expiration_minutes: expirationMinutes },
    });
    return response.data.download_url;
  } catch {
    return fileKey;
  }
}

function isFileKey(url: string): boolean {
  return !!url && (url.startsWith("uploads/") || !url.includes("://"));
}

function detectMediaType(url?: string): "image" | "video" {
  if (!url) return "image";
  const lower = url.toLowerCase();
  const videoExtensions = [
    ".mp4",
    ".mov",
    ".webm",
    ".avi",
    ".mkv",
    ".wmv",
    ".flv",
    ".f4v",
    ".3gp",
    ".m4v",
    ".mpeg",
    ".mpg",
    ".mts",
    ".m2ts",
    ".ogv",
    ".ts",
    ".vob",
    ".mxf",
  ];
  return videoExtensions.some((ext) => lower.includes(ext)) ? "video" : "image";
}

export default function PostSettingForCarousel({ carouselPost, onClose }: Props) {
  // [FIX 1] Memoize platforms
  const platforms = useMemo(() => {
    return carouselPost.posts.map((p: any) => ({
      id: p.platform.id,
      name:
        p.platform.channel_type.charAt(0).toUpperCase() +
        p.platform.channel_type.slice(1),
      channel: p.platform.channel_type,
      icon:
        p.platform.channel_type === "facebook"
          ? FaFacebook
          : p.platform.channel_type === "linkedin"
          ? FaLinkedin
          : null,
    }));
  }, [carouselPost.posts]);

  const [selectedPlatform, setSelectedPlatform] = useState<string>(
    platforms[0]?.channel || "linkedin"
  );

  // ---- MEDIA URL STATE (all slides) ----
  const [isFetchingUrls, setIsFetchingUrls] = useState(true);
  const [displayFirstMediaUrl, setDisplayFirstMediaUrl] = useState("");
  const [displayAllMediaUrls, setDisplayAllMediaUrls] = useState<string[]>([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  // ---- ANALYSIS STATE ----
  const [slidesData, setSlidesData] = useState<Record<number, SlideAnalysisData>>(
    {}
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ---- FORM STATE ----
  const [metadataTitle, _setMetadataTitle] = useState<Record<string, string>>({});
  const [metadataDesc, _setMetadataDesc] = useState<Record<string, string>>({});
  const [hashtags, _setHashtags] = useState<Record<string, string[]>>({});
  const [prompts, _setPrompts] = useState<Record<string, string>>({});
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  
  const [metadataContent, setMetadataContent] = useState<{
    title: string;
    description: string;
    tags: string[];
  }>({ title: "", description: "", tags: [] });

  const [captions, setCaptions] = useState<Record<string, any[]>>({});

  const [ratios, setRatios] = useState<Record<string, AspectRatio>>(
    Object.fromEntries(platforms.map((p: any) => [p.channel, "square"]))
  );
  const [resizedThumbnails, setResizedThumbnails] = useState<
    Record<string, string>
  >({});
  const [resizedAspect, setResizedAspect] = useState<
    Record<AspectRatio, string>
  >({ square: "", vertical: "", horizontal: "" });
  const [updatedMedia, setUpdatedMedia] = useState<Record<string, string>>({});

  // WRAPPED setters
  const updateSlideFromFields = (
    idx: number,
    patch: Partial<Omit<SlideAnalysisData, "isAnalyzed">>
  ) => {
    setSlidesData((prev) => {
      const existing: SlideAnalysisData =
        prev[idx] || {
          title: "",
          description: "",
          hashtags: [],
          prompt: "",
          thumbnailUrl: null,
          isAnalyzed: false,
        };
      return {
        ...prev,
        [idx]: {
          ...existing,
          ...patch,
          isAnalyzed: true,
        },
      };
    });
  };

  const setMetadataTitleWrapped: Dispatch<
    SetStateAction<Record<string, string>>
  > = (updater) => {
    _setMetadataTitle((prev) => {
      const next =
        typeof updater === "function" ? (updater as any)(prev) : updater;
      const contentTitle = next["content"] ?? "";
      if (contentTitle) {
        updateSlideFromFields(selectedMediaIndex, { title: contentTitle });
      }
      return next;
    });
  };

  const setMetadataDescWrapped: Dispatch<
    SetStateAction<Record<string, string>>
  > = (updater) => {
    _setMetadataDesc((prev) => {
      const next =
        typeof updater === "function" ? (updater as any)(prev) : updater;
      const contentDesc = next["content"] ?? "";
      if (contentDesc) {
        updateSlideFromFields(selectedMediaIndex, { description: contentDesc });
      }
      return next;
    });
  };

  const setHashtagsWrapped: Dispatch<
    SetStateAction<Record<string, string[]>>
  > = (updater) => {
    _setHashtags((prev) => {
      const next =
        typeof updater === "function" ? (updater as any)(prev) : updater;
      const contentTags = next["content"] ?? [];
      updateSlideFromFields(selectedMediaIndex, { hashtags: contentTags });
      return next;
    });
  };

  const setPromptsWrapped: Dispatch<SetStateAction<Record<string, string>>> = (
    updater
  ) => {
    _setPrompts((prev) => {
      const next =
        typeof updater === "function" ? (updater as any)(prev) : updater;
      const contentPrompt = next["content"] ?? "";
      if (contentPrompt) {
        updateSlideFromFields(selectedMediaIndex, { prompt: contentPrompt });
      }
      return next;
    });
  };

  // 1. FETCH SIGNED URLS
  const refreshUrls = useCallback(async () => {
    setIsFetchingUrls(true);
    try {
      const firstUrl = await fetchPresignedUrl(carouselPost.firstMediaUrl);
      setDisplayFirstMediaUrl(firstUrl);

      if (carouselPost.posts[0]?.allMediaUrls) {
        const allUrls = await Promise.all(
          carouselPost.posts[0].allMediaUrls.map((url: string) =>
            fetchPresignedUrl(url)
          )
        );
        setDisplayAllMediaUrls(allUrls);
      } else {
        setDisplayAllMediaUrls([firstUrl]);
      }
    } finally {
      setIsFetchingUrls(false);
    }
  }, [carouselPost]);

  useEffect(() => {
    refreshUrls();
  }, [refreshUrls]);

  // 2. INIT FROM BACKEND
  useEffect(() => {
    if (!carouselPost) return;

    const firstPost = carouselPost.posts[0];
    const savedSlidesData =
      ((firstPost?.metadata as any)?.slides_analysis as
        | Record<number, SlideAnalysisData>
        | undefined) || {};
    if (Object.keys(savedSlidesData).length > 0) {
      setSlidesData(savedSlidesData);
    }

    const newTitles: Record<string, string> = {};
    const newDescs: Record<string, string> = {};
    const newPrompts: Record<string, string> = {};
    const newTags: Record<string, string[]> = {};
    let newMetadataContent = { title: "", description: "", tags: [] as string[] };

    carouselPost.posts.forEach((p) => {
      const key = p.platform?.channel_type?.toLowerCase();
      if (!key) return;
      if (p.title) newTitles[key] = p.title;
      if (p.metadata?.description)
        newDescs[key] = p.metadata.description as string;
      if ((p.metadata as any)?.ai_prompt)
        newPrompts["content"] = (p.metadata as any).ai_prompt as string;
      if (p.tags) newTags[key] = p.tags as string[];
      if (p.content) {
        newMetadataContent = p.content;
      }
    });

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

    _setMetadataTitle(newTitles);
    _setMetadataDesc(newDescs);
    _setHashtags(newTags);
    _setPrompts(newPrompts);
    setMetadataContent(newMetadataContent);
  }, [carouselPost]);

  // 3. POPULATE FORM WHEN SLIDE INDEX CHANGES
  useEffect(() => {
    const slide = slidesData[selectedMediaIndex];
    if (!slide) return;

    _setPrompts((prev) => ({ ...prev, content: slide.prompt }));

    setMetadataContent({
      title: slide.title,
      description: slide.description,
      tags: slide.hashtags,
    });

    if (slide.thumbnailUrl) {
      setThumbnail(slide.thumbnailUrl);
      const keys = platforms.map((p: any) => p.channel.toLowerCase());
      setResizedThumbnails((prev) => {
        const n = { ...prev };
        keys.forEach((k) => (n[k] = slide.thumbnailUrl!));
        return n;
      });
    }

    const keys = ["content", ...platforms.map((p: any) => p.channel.toLowerCase())];

    _setMetadataTitle((prev) => {
      const n = { ...prev };
      keys.forEach((k) => (n[k] = slide.title));
      return n;
    });

    _setMetadataDesc((prev) => {
      const n = { ...prev };
      keys.forEach((k) => (n[k] = slide.description));
      return n;
    });

    _setHashtags((prev) => {
      const n = { ...prev };
      keys.forEach((k) => (n[k] = slide.hashtags));
      return n;
    });
    // [FIX] Loop dependency removed. Effect only runs on index change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMediaIndex]);

  // 4. AUTO ANALYZE (UPDATED TO FILL UI)
  useEffect(() => {
    const run = async () => {
      if (isFetchingUrls) return;

      const url = displayAllMediaUrls[selectedMediaIndex];
      // [FIX] URL Validation
      if (!url || url.startsWith("blob:") || !url.startsWith("http")) return;

      const cached = slidesData[selectedMediaIndex];
      if (cached?.isAnalyzed) return;

      setIsAnalyzing(true);
      try {
        const { data } = await api.post(MEDIA_ENGINE_URLS.ANALYZE_MEDIA_URL, {
          media_url: url,
          media_type: "auto",
          tone: "professional",
          platform: "any",
          prompt_hint: "",
        });

        if (data) {
          const prompt = data.generated_prompt || "";
          const rawDesc = data.metadata?.description || "";
          const tags: string[] = data.metadata?.hashtags || [];
          const combinedDesc = tags.length > 0 ? `${rawDesc}\n\n${tags.join(" ")}` : rawDesc;
          const title = data.metadata?.title || "";
          const thumb = data.thumbnail_url || null;

          const slide: SlideAnalysisData = {
            title,
            description: combinedDesc,
            hashtags: tags,
            prompt,
            thumbnailUrl: thumb,
            isAnalyzed: true,
          };

          // Update Cache
          setSlidesData((prev) => ({ ...prev, [selectedMediaIndex]: slide }));

          // [FIX START] Manually populate UI states immediately so fields show data
          _setPrompts((prev) => ({ ...prev, content: prompt }));
          
          setMetadataContent({
              title,
              description: combinedDesc,
              tags
          });

          // Update all platform tabs + content tab
          const keys = ["content", ...platforms.map((p: any) => p.channel.toLowerCase())];

          _setMetadataTitle((prev) => {
            const n = { ...prev };
            keys.forEach((k) => (n[k] = title));
            return n;
          });

          _setMetadataDesc((prev) => {
            const n = { ...prev };
            keys.forEach((k) => (n[k] = combinedDesc));
            return n;
          });

          _setHashtags((prev) => {
            const n = { ...prev };
            keys.forEach((k) => (n[k] = tags));
            return n;
          });
          // [FIX END]

          toast.success(`Analysis complete for slide ${selectedMediaIndex + 1}`);
        }
      } catch (e) {
        console.error(e);
        toast.error("Auto-generation failed.");
      } finally {
        setIsAnalyzing(false);
      }
    };

    const t = setTimeout(run, 600);
    return () => clearTimeout(t);
  }, [
    selectedMediaIndex,
    displayAllMediaUrls,
    isFetchingUrls,
    slidesData,
    platforms // Added platforms to deps so keys are correct
  ]);

  // 5. BUILD POST OBJECT
  const convertedPost: PostType = useMemo(() => {
    const rawUrl =
      displayAllMediaUrls[selectedMediaIndex] || displayFirstMediaUrl;
    const currentMediaUrl =
      rawUrl && rawUrl.trim() !== "" ? rawUrl : "/placeholder.png";

    return {
      mainId: carouselPost.mainId,
      agent: carouselPost.agent,
      mediaUrl: currentMediaUrl,
      size: 1,
      posts: carouselPost.posts.map((p) => {
        const platformKey = p.platform?.channel_type?.toLowerCase();
        return {
          postId: p.postId,
          title:
            (platformKey && metadataTitle[platformKey]) ||
            metadataTitle["content"] ||
            p.title,
          mediaUrl: currentMediaUrl,
          status: p.status,
          caption: captions[platformKey || ""] || [],
          tags:
            (platformKey && (hashtags[platformKey] || hashtags["content"])) ||
            (p.tags as string[]) ||
            [],
          thumbnailUrl: thumbnail || p.thumbnailUrl,
          resize: "square",
          metadata: { ...p.metadata },
          scheduleTime: p.scheduleTime,
          date: p.date,
          platform: p.platform,
          source: p.source,
          content: metadataContent,
        };
      }),
    };
  }, [
    carouselPost,
    displayAllMediaUrls,
    displayFirstMediaUrl,
    selectedMediaIndex,
    metadataTitle,
    hashtags,
    captions,
    thumbnail,
    metadataContent,
  ]);

  const isCurrentVideo =
    detectMediaType(displayAllMediaUrls[selectedMediaIndex]) === "video";

  // 6. SAVE CHANGES
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const payload = {
        id: carouselPost.mainId,
        agent: carouselPost.agent,
        channel_posts: carouselPost.posts.map((p) => {
          const platformKey = p.platform.channel_type.toLowerCase();
          return {
            post_id: p.postId,
            channel: p.platform.id,
            title:
              metadataTitle[platformKey] ||
              metadataTitle["content"] ||
              p.title,
            metadata: {
              ...(p.metadata as any),
              description:
                metadataDesc[platformKey] ||
                metadataDesc["content"] ||
                (p.metadata?.description as string) ||
                "",
              ai_prompt:
                prompts["content"] ||
                (p.metadata as any)?.ai_prompt ||
                "",
              slides_analysis: slidesData,
            },
            tags:
              hashtags[platformKey] ||
              hashtags["content"] ||
              (p.tags as string[]) ||
              [],
            content: metadataContent, 
          };
        }),
      };

      await api.patch(
        AGENT_URLS.PATCH_POST(carouselPost.agent, carouselPost.mainId),
        payload
      );
      toast.success("Carousel settings saved!");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save changes.");
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
              Carousel Post Settings
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

        {/* BODY */}
        <div className="p-4 w-full">
          {/* Slide thumbnails strip */}
          <div className="p-1 gap-2 flex flex-wrap">
            {displayAllMediaUrls.map((url, i) => {
              const isVid = detectMediaType(url) === "video";
              const isSelected = i === selectedMediaIndex;
              const isAnalyzedFlag = slidesData[i]?.isAnalyzed;

              return (
                <div
                  key={i}
                  onClick={() => setSelectedMediaIndex(i)}
                  className={`relative w-[56px] h-[56px] rounded-md flex items-center justify-center cursor-pointer transition-all ${
                    isSelected
                      ? "border-2 border-[#FDE047]"
                      : "border border-gray-200 hover:border-[#FDE047]/70"
                  }`}
                >
                  <div className="relative w-[50px] h-[50px] rounded-md overflow-hidden bg-gray-100">
                    {isVid ? (
                      <>
                        <video
                          src={url}
                          className="object-cover w-full h-full opacity-70"
                        />
                        <FaPlayCircle className="absolute inset-0 m-auto h-6 w-6 text-white drop-shadow-lg" />
                      </>
                    ) : (
                      <Image
                        src={url || "/placeholder.png"}
                        alt="Slide"
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

          {/* Main area – left tabs + right preview */}
          <div className="mt-6 flex gap-6">
            {/* LEFT: Tabs */}
            <div className="w-1/2">
              <Tabs defaultValue="Metadata">
                <TabsList>
                  <TabsTrigger value="Metadata">Metadata</TabsTrigger>
                  {isCurrentVideo && (
                    <TabsTrigger value="Thumbnail">Thumbnail</TabsTrigger>
                  )}
                  {isCurrentVideo && (
                    <TabsTrigger value="Captions">Captions</TabsTrigger>
                  )}
                </TabsList>
                <div className="mt-4">
                  <TabsContent value="Metadata">
                    <Metadata
                      post={convertedPost}
                      metadataTitle={metadataTitle}
                      setMetadataTitle={setMetadataTitleWrapped}
                      metadataDesc={metadataDesc}
                      setMetadataDesc={setMetadataDescWrapped}
                      hashtags={hashtags}
                      setHashtags={setHashtagsWrapped}
                      metadataContent={metadataContent}
                      setMetadataContent={setMetadataContent}
                      prompts={prompts}
                      setPrompts={setPromptsWrapped}
                    />
                  </TabsContent>

                  <TabsContent value="Thumbnail">
                    <Thumbnail
                      thumbnail={thumbnail}
                      setThumbnail={setThumbnail}
                      ratios={ratios}
                      resizedThumbnails={resizedThumbnails}
                      setResizedThumbnails={setResizedThumbnails}
                      selectedPost={convertedPost}
                      setSelectedPost={() => {}}
                      selectedPlatform={selectedPlatform}
                      autoPrompt={prompts["content"]}
                    />
                  </TabsContent>

                  <TabsContent value="Captions">
                    <Captions
                      captions={captions}
                      setCaptions={setCaptions}
                      selectedPost={convertedPost}
                      setSelectedPost={() => {}}
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

            {/* RIGHT: Preview */}
            {!isFetchingUrls && convertedPost.mediaUrl && (
              <PreviewPanel
                key={`${convertedPost.mainId}-${selectedMediaIndex}`}
                post={convertedPost}
                ratios={ratios}
                setRatios={setRatios}
                selectedPlatform={selectedPlatform}
                setSelectedPlatform={setSelectedPlatform}
                resizedAspect={resizedAspect}
                setResizedAspect={setResizedAspect}
                updatedMedia={updatedMedia}
                setUpdatedMedia={setUpdatedMedia}
              />
            )}
          </div>
        </div>
      </div>

      {/* FULL SCREEN ANALYSIS LOADER */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-[9999] animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center border border-gray-100">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#FDE047] blur-xl opacity-30 rounded-full animate-pulse"></div>
              <Loader2 className="w-12 h-12 animate-spin text-[#FDE047] relative z-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Analyzing Media
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Generating captions, hashtags, and metadata.
            </p>
            <div className="mt-6 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-[#FDE047] w-full origin-left animate-progress"></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}