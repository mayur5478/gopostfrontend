"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  Dispatch,
  SetStateAction,
  useRef,
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
type Modes = "fill" | "crop" | "hybrid";
const IMAGE_SIZES: Record<AspectRatio, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  vertical: { width: 1080, height: 1920 },
  horizontal: { width: 1920, height: 1080 },
  //  '':{width: 1080, height: 1080}
};

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
  onSave: () => void;
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

export default function PostSettingForCarousel({ carouselPost, onClose, onSave }: Props) {
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

  const [selectedTab, setSelectedTab] = useState<"Metadata" | "Thumbnail" | "Captions">("Metadata");
  const handleMediaClick = (index: number) => {
    setSelectedMediaIndex(index);

    const url = displayAllMediaUrls[index];
    const type = detectMediaType(url);

    if (type === "image") {
      setSelectedTab("Metadata"); // force metadata for image slides
    }
  };

  const [selectedPlatform, setSelectedPlatform] = useState<string>(
    platforms[0]?.channel || "linkedin"
  );

  // ---- MEDIA URL STATE (all slides) ----
  const [isFetchingUrls, setIsFetchingUrls] = useState(true);
  const [displayFirstMediaUrl, setDisplayFirstMediaUrl] = useState("");
  const [displayAllMediaUrls, setDisplayAllMediaUrls] = useState<string[]>([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const prevMediaIndexRef = useRef(0);

  // ---- ANALYSIS STATE ----
  const [slidesData, setSlidesData] = useState<Record<number, SlideAnalysisData>>(
    {}
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResizing , setIsResizing] = useState(false);
  // ---- FORM STATE ----
  const [metadataTitle, _setMetadataTitle] = useState<Record<string, string>>({});
  const [metadataDesc, _setMetadataDesc] = useState<Record<string, string>>({});
  const [hashtags, _setHashtags] = useState<Record<string, string[]>>({});
  const [prompts, _setPrompts] = useState<Record<string, string>>({});
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [allResizedMedia, setAllResizedMedia] = useState<
    Record<number, Record<AspectRatio, string>>
  >({});
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


  const platformKeys = useMemo(
    () => ["content", ...platforms.map((p) => p.channel.toLowerCase())],
    [platforms]
  );
const resizedAspectRef = useRef(resizedAspect);
useEffect(() => {
  resizedAspectRef.current = resizedAspect;
}, [resizedAspect]);

  const slidesDataRef = useRef(slidesData);
  slidesDataRef.current = slidesData;

  // keep a stable reference to platforms
  const platformKeysRef = useRef<string[]>([]);
  if (platformKeysRef.current.length === 0) {
    platformKeysRef.current = ["content", ...platforms.map(p => p.channel.toLowerCase())];
  }

  useEffect(() => {
  const slide = slidesData[selectedMediaIndex];
  if (!slide) return; // WAIT until data is available

  // Load saved resized results
  const saved = allResizedMedia[selectedMediaIndex] || {};

  setResizedAspect({
    square: saved.square || "",
    vertical: saved.vertical || "",
    horizontal: saved.horizontal || "",
  });

  const currentUrl = displayAllMediaUrls[selectedMediaIndex];
  setThumbnail(slide.thumbnailUrl ?? currentUrl);

  _setPrompts(prev => ({ ...prev, content: slide.prompt }));
  setMetadataContent({
    title: slide.title,
    description: slide.description,
    tags: slide.hashtags,
  });

  const keys = platformKeysRef.current;

  _setMetadataTitle(prev => {
    const n = { ...prev };
    keys.forEach(k => (n[k] = slide.title));
    return n;
  });

  _setMetadataDesc(prev => {
    const n = { ...prev };
    keys.forEach(k => (n[k] = slide.description));
    return n;
  });

  _setHashtags(prev => {
    const n = { ...prev };
    keys.forEach(k => (n[k] = slide.hashtags));
    return n;
  });

}, [
  selectedMediaIndex,
  slidesData,
  allResizedMedia,
  displayAllMediaUrls
]);
useEffect(() => {
  const prev = prevMediaIndexRef.current;

  if (prev !== selectedMediaIndex) {
    setAllResizedMedia(prevState => ({
      ...prevState,
      [prev]: {
        ...(prevState[prev] || {}),
        ...resizedAspectRef.current,
      },
    }));
  }

  prevMediaIndexRef.current = selectedMediaIndex;

}, [selectedMediaIndex]);

  // 3. POPULATE FORM WHEN SLIDE INDEX CHANGES
//   useEffect(() => {
//     const allSlides = slidesDataRef.current;
//     if (!allSlides || Object.keys(allSlides).length === 0) return;

//     const slide = allSlides[selectedMediaIndex];
//     if (!slide) return;

//     // Save previous resizedAspect
//     const prevIndex = prevMediaIndexRef.current;
// if (prevIndex !== selectedMediaIndex) {
// setAllResizedMedia(prev => ({
//   ...prev,
//   [prevIndex]: {
//     ...(prev[prevIndex] || {}),
//     ...resizedAspectRef.current,  // ✅ always latest version
//   }
// }));

// }
// console.log("inside useEffect of SelextedMediaIndex", prevIndex, allResizedMedia, resizedAspect)
// prevMediaIndexRef.current = selectedMediaIndex;
//     // Thumbnail logic
//     const currentUrl = displayAllMediaUrls[selectedMediaIndex];
//     const effectiveThumb =
//       slide.thumbnailUrl != null ? slide.thumbnailUrl : currentUrl;

//     setThumbnail(effectiveThumb);

//     // Load slide-specific resizedAspect
// const savedAspect = allResizedMedia[selectedMediaIndex];

// setResizedAspect({
//   square: savedAspect?.square || "",
//   vertical: savedAspect?.vertical || "",
//   horizontal: savedAspect?.horizontal || "",
// });



//     // Load metadata into UI
//     _setPrompts(prev => ({ ...prev, content: slide.prompt }));
//     setMetadataContent({
//       title: slide.title,
//       description: slide.description,
//       tags: slide.hashtags,
//     });

//     // Populate metadata for all platforms
//     const keys = platformKeysRef.current;

//     _setMetadataTitle(prev => {
//       const n = { ...prev };
//       keys.forEach(k => (n[k] = slide.title));
//       return n;
//     });

//     _setMetadataDesc(prev => {
//       const n = { ...prev };
//       keys.forEach(k => (n[k] = slide.description));
//       return n;
//     });

//     _setHashtags(prev => {
//       const n = { ...prev };
//       keys.forEach(k => (n[k] = slide.hashtags));
//       return n;
//     });

//   }, [selectedMediaIndex]);  // ONLY this

  //   useEffect(() => {
  //       if (!slidesData || Object.keys(slidesData).length === 0) return;
  //     const slide = slidesData[selectedMediaIndex];
  //     if (!slide) return;
  //   const prevIndex = prevMediaIndexRef.current;

  //   // Save the resizedAspect for the previous slide BEFORE reset
  //   setAllResizedMedia(prev => ({
  //     ...prev,
  //     [prevIndex]: { ...resizedAspect }
  //   }));

  //   // Update previous index reference
  //   prevMediaIndexRef.current = selectedMediaIndex;

  //   // ... rest of your logic

  // //  setThumbnail(slide.thumbnailUrl || null);
  // const currentUrl = displayAllMediaUrls[selectedMediaIndex];

  // // If slide is video → use real thumbnail
  // // If slide is image → use slide's own image
  // const effectiveThumb =
  //   slide.thumbnailUrl !== null && slide.thumbnailUrl !== undefined
  //     ? slide.thumbnailUrl
  //     : currentUrl;

  // setThumbnail(effectiveThumb);

  // const saved = allResizedMedia[selectedMediaIndex];
  // if (saved) {
  //   setResizedAspect(saved);
  // } else {
  //   setResizedAspect({ square: "", vertical: "", horizontal: "" });
  // }

  //     _setPrompts((prev) => ({ ...prev, content: slide.prompt }));

  //     setMetadataContent({
  //       title: slide.title,
  //       description: slide.description,
  //       tags: slide.hashtags,
  //     });

  //     if (slide.thumbnailUrl) {
  //       const keys = platforms.map((p: any) => p.channel.toLowerCase());
  //       setResizedThumbnails((prev) => {
  //         const n = { ...prev };
  //         keys.forEach((k) => (n[k] = slide.thumbnailUrl!));
  //         return n;
  //       });
  //     }

  // const keys = platformKeys;

  //     _setMetadataTitle((prev) => {
  //       const n = { ...prev };
  //       keys.forEach((k) => (n[k] = slide.title));
  //       return n;
  //     });

  //     _setMetadataDesc((prev) => {
  //       const n = { ...prev };
  //       keys.forEach((k) => (n[k] = slide.description));
  //       return n;
  //     });

  //     _setHashtags((prev) => {
  //       const n = { ...prev };
  //       keys.forEach((k) => (n[k] = slide.hashtags));
  //       return n;
  //     });
  //     // [FIX] Loop dependency removed. Effect only runs on index change.
  //     // eslint-disable-next-line react-hooks/exhaustive-deps
  //   }, [selectedMediaIndex, platforms]);

  // 4. AUTO ANALYZE (UPDATED TO FILL UI)

  // 4. AUTO ANALYZE (MASTER METADATA + PER-SLIDE THUMBNAILS)
  useEffect(() => {
    const run = async () => {
      if (isFetchingUrls) return;

      const url = displayAllMediaUrls[selectedMediaIndex];
      if (!url || !url.startsWith("http")) return;

      const cached = slidesData[selectedMediaIndex];

      //MASTER SLIDE (index 0) → FULL METADATA ANALYSIS
      if (selectedMediaIndex === 0) {
        // Already analyzed before (cached from backend or earlier) → skip
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
            const combinedDesc =
              tags.length > 0 ? `${rawDesc}\n\n${tags.join(" ")}` : rawDesc;
            const title = data.metadata?.title || "";
            const thumb = data.thumbnail_url || null;

            // Save master metadata
            setSlidesData((prev) => ({
              ...prev,
              0: {
                title,
                description: combinedDesc,
                hashtags: tags,
                prompt,
                thumbnailUrl: thumb,
                isAnalyzed: true,
              },
            }));

            // Update UI
            _setPrompts((prev) => ({ ...prev, content: prompt }));
            setMetadataContent({ title, description: combinedDesc, tags });

            // Update metadata fields for ALL platforms
            const platformKeys = [
              "content",
              ...platforms.map((p) => p.channel.toLowerCase()),
            ];

            _setMetadataTitle((prev) => {
              const n = { ...prev };
              platformKeys.forEach((k) => (n[k] = title));
              return n;
            });

            _setMetadataDesc((prev) => {
              const n = { ...prev };
              platformKeys.forEach((k) => (n[k] = combinedDesc));
              return n;
            });

            _setHashtags((prev) => {
              const n = { ...prev };
              platformKeys.forEach((k) => (n[k] = tags));
              return n;
            });

            // Video thumbnail for master slide
            if (thumb) {
              setThumbnail(thumb);
              const keys = platforms.map((p) => p.channel.toLowerCase());
              setResizedThumbnails((prev) => {
                const n = { ...prev };
                keys.forEach((k) => (n[k] = thumb));
                return n;
              });
            }

            toast.success("Master slide analyzed ✓");
          }
        } catch (e) {
          console.error(e);
          toast.error("Master analysis failed.");
        } finally {
          setIsAnalyzing(false);
        }

        return; // IMPORTANT: stop processing here for master slide
      }

      //OTHER SLIDES (index > 0) → ONLY THUMBNAIL EXTRACTION

      // If already analyzed, skip
      if (cached?.isAnalyzed) return;

      // Ensure master metadata exists before processing other slides
      const master = slidesData[0];
      if (!master) return;

      const isVideo = detectMediaType(url) === "video";

      if (isVideo) {
        try {
          const { data } = await api.post(MEDIA_ENGINE_URLS.ANALYZE_MEDIA_URL, {
            media_url: url,
            media_type: "video_thumbnail",
          });

          if (data?.thumbnail_url) {
            const thumb = data.thumbnail_url;

            setSlidesData((prev) => ({
              ...prev,
              [selectedMediaIndex]: {
                ...master, // copy ALL metadata from master
                thumbnailUrl: thumb,
                isAnalyzed: true,
              },
            }));
            if (thumb) {
              setThumbnail(thumb);
              const keys = platforms.map((p) => p.channel.toLowerCase());
              setResizedThumbnails((prev) => {
                const n = { ...prev };
                keys.forEach((k) => (n[k] = thumb));
                return n;
              });
            }
            // Update UI preview
            // setThumbnail(thumb);
          }
        } catch (e) {
          console.error("Thumbnail extraction failed", e);
        }
      } else {
        // Non-video slides: store metadata but no thumbnail
        setSlidesData((prev) => ({
          ...prev,
          [selectedMediaIndex]: {
            ...master,
            thumbnailUrl: null,
            isAnalyzed: true,
          },
        }));
      }
    };

    const t = setTimeout(run, 400);
    return () => clearTimeout(t);
  }, [
    selectedMediaIndex,
    displayAllMediaUrls,
    isFetchingUrls,
    slidesData,
    platforms,
  ]);


  // 5. BUILD POST OBJECT
  // const convertedPost: PostType = useMemo(() => {
  //   const rawUrl =
  //     displayAllMediaUrls[selectedMediaIndex] || displayFirstMediaUrl;
  //   const currentMediaUrl =
  //     rawUrl && rawUrl.trim() !== "" ? rawUrl : "/placeholder.png";

  //   return {
  //     mainId: carouselPost.mainId,
  //     agent: carouselPost.agent,
  //     mediaUrl: currentMediaUrl,
  //     size: 1,
  //     posts: carouselPost.posts.map((p) => {
  //       const platformKey = p.platform?.channel_type?.toLowerCase();
  //       return {
  //         postId: p.postId,
  //         title:
  //           (platformKey && metadataTitle[platformKey]) ||
  //           metadataTitle["content"] ||
  //           p.title,
  //         mediaUrl: currentMediaUrl,
  //         status: p.status,
  //         caption: captions[platformKey || ""] || [],
  //         tags:
  //           (platformKey && (hashtags[platformKey] || hashtags["content"])) ||
  //           (p.tags as string[]) ||
  //           [],
  //         thumbnailUrl: thumbnail || p.thumbnailUrl,
  //         resize: "square",
  //         metadata: { ...p.metadata },
  //         scheduleTime: p.scheduleTime,
  //         date: p.date,
  //         platform: p.platform,
  //         source: p.source,
  //         content: metadataContent,
  //       };
  //     }),
  //   };
  // }, [
  //  carouselPost,
  //  selectedMediaIndex,
  //  displayAllMediaUrls,
  //  metadataTitle,
  //  hashtags,
  //  captions,
  //  thumbnail,
  //  metadataContent,
  //  resizedAspect,
  //  updatedMedia,
  //  resizedThumbnails

  // ]);

  const isCurrentVideo =
    detectMediaType(displayAllMediaUrls[selectedMediaIndex]) === "video";

  const resizeVideoInternal = async (url: string, aspect: AspectRatio) => {
    setIsResizing(true);
    const { data } = await api.post(MEDIA_ENGINE_URLS.RESIZE_MEDIA, {
      video_url: url,
      presets: aspect,
    });
    setIsResizing(false);
    return data.resized_videos[aspect].url;
  };

  const resizeImageInternal = async (url: string, aspect: AspectRatio) => {
    const size = IMAGE_SIZES[aspect];
        setIsResizing(true);
    const { data } = await api.post(MEDIA_ENGINE_URLS.RESIZE_IMAGE, {
      image_url: url,
      width: size.width,
      height: size.height,
      mode: "hybrid",
    });
    setIsResizing(false);
    return data.image_url;
  };

  async function getOrCreateResizedUrl({
    slideIndex,
    platformKey,
    rawUrl,
    ratios,
    allResizedMedia,
    setAllResizedMedia,
  }: {
    slideIndex: number;
    platformKey: string;
    rawUrl: string;
    ratios: Record<string, AspectRatio>;
    allResizedMedia: Record<number, Record<AspectRatio, string>>;
    setAllResizedMedia: any;
  }): Promise<string> {
    const aspect = ratios[platformKey];
    const isVideo = detectMediaType(rawUrl) === "video";

    // 1) If we already resized this slide for this aspect → use it
    const existing = allResizedMedia[slideIndex]?.[aspect];
    if (existing) return existing;

    // 2) If not exists → RESIZE NOW
    let resized: string;
    if (isVideo) {
      resized = await resizeVideoInternal(rawUrl, aspect);
    } else {
      resized = await resizeImageInternal(rawUrl, aspect);
    }

    // 3) Store in allResizedMedia
    setAllResizedMedia((prev: any) => ({
      ...prev,
      [slideIndex]: {
        ...(prev[slideIndex] || {}),
        [aspect]: resized,
      },
    }));

    return resized;
  }
  const handleSaveChanges = async () => {
    setIsSaving(true);

    try {
      const finalChannelPosts: any[] = [];

      // LOOP THROUGH EACH PLATFORM POST
      for (const p of carouselPost.posts) {
        const platformKey = p.platform.channel_type.toLowerCase();

        const updatedSlideUrls: string[] = [];

        // LOOP THROUGH ALL SLIDES IN CAROUSEL
        for (let slideIndex = 0; slideIndex < displayAllMediaUrls.length; slideIndex++) {
          const originalUrl = displayAllMediaUrls[slideIndex];

          const finalUrl = await getOrCreateResizedUrl({
            slideIndex,
            platformKey,
            rawUrl: originalUrl,
            ratios,
            allResizedMedia,
            setAllResizedMedia,
          });

          updatedSlideUrls.push(finalUrl);
        }

        // first slide URL becomes media_url
        const coverUrl = updatedSlideUrls[0];

        finalChannelPosts.push({
          post_id: p.postId,
          channel: p.platform.id,

          title:
            metadataTitle[platformKey] ||
            metadataTitle["content"] ||
            p.title,

          media_url: coverUrl,

          metadata: {
            ...(p.metadata as any),
            description:
              metadataDesc[platformKey] ||
              metadataDesc["content"] ||
              "",
            ai_prompt:
              prompts["content"] ||
              (p.metadata as any)?.ai_prompt ||
              "",
            media_urls: updatedSlideUrls, // IMPORTANT
            slides_analysis: slidesData,
            resize: ratios[platformKey],
          },

          tags:
            hashtags[platformKey] ||
            hashtags["content"] ||
            [],

          content: metadataContent,
        });
      }

      const payload = {
        id: carouselPost.mainId,
        agent: carouselPost.agent,
        channel_posts: finalChannelPosts,
      };

      await api.patch(
        AGENT_URLS.PATCH_POST(carouselPost.agent, carouselPost.mainId),
        payload
      );

      toast.success("Carousel settings saved!");
      onSave();
      onClose();

    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };



  const previewKey = `${selectedMediaIndex}-${thumbnail}-${JSON.stringify(ratios)}-${JSON.stringify(resizedAspect)}`;

  // REAL dynamic object like selectedPost in PostSetting
  const selectedSlidePost: PostType = useMemo(() => {
    const rawUrl = displayAllMediaUrls[selectedMediaIndex] || displayFirstMediaUrl;

    const platformKey = selectedPlatform.toLowerCase();
    //  GET STORED ASPECT FOR CURRENT SLIDE
const storedAspect = allResizedMedia[selectedMediaIndex] || {
  square: "",
  vertical: "",
  horizontal: ""
};

console.log("storedAspect11",storedAspect)
    //  CHOOSE CORRECT MEDIA PER PLATFORM & PER SLIDE
const aspect = ratios[platformKey];

const finalMediaUrl =
  storedAspect?.[aspect] && storedAspect[aspect].length > 0
    ? storedAspect[aspect]                     // Use resized version
    : updatedMedia[platformKey] || rawUrl;     // Fallback to updated or original


console.log("finalMediaUrl11",finalMediaUrl)

    const finalThumbnail =
      resizedThumbnails[platformKey] ||
      thumbnail ||
      null;

    return {
      mainId: carouselPost.mainId,
      agent: carouselPost.agent,
      mediaUrl: finalMediaUrl,
      size: 1,
      posts: carouselPost.posts.map((p) => {
        const key = p.platform.channel_type.toLowerCase();
        return {
          postId: p.postId,
          title: metadataTitle[key] || metadataTitle["content"] || "",
          mediaUrl: finalMediaUrl, // IMPORTANT
          status: p.status,
          caption: captions[key] || [],
          tags: hashtags[key] || hashtags["content"] || [],
          thumbnailUrl: finalThumbnail || "",
          resize: ratios[key] || "square",
          metadata: p.metadata,
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
    selectedPlatform,
    resizedAspect,
    updatedMedia,
    resizedThumbnails,
    metadataTitle,
    hashtags,
    captions,
    thumbnail,
    ratios,
    metadataContent,
  ]);


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
              className={`rounded-2xl flex items-center gap-2 px-4 transition-all ${isSaving
                ? "bg-[#FDE047]/70 cursor-not-allowed"
                : "bg-[#FDE047] hover:bg-[#FDE047]/90"
                }`}
            >
{isSaving ? (
  isResizing ? (
    <span className="text-black text-xs whitespace-nowrap">
      Currently resizing other images to match selected aspect ratio, please wait...
    </span>
  ) : (
    <Loader2 className="w-4 h-4 animate-spin text-black" />
  )
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
                  onClick={() => handleMediaClick(i)}
                  className={`relative w-[56px] h-[56px] rounded-md flex items-center justify-center cursor-pointer transition-all ${isSelected
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
              <Tabs
                value={selectedTab}
                onValueChange={(val) =>
                  setSelectedTab(val as "Metadata" | "Thumbnail" | "Captions")
                }
              >
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
                      post={selectedSlidePost}
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
                      selectedPost={selectedSlidePost}
                      setSelectedPost={() => { }}
                      selectedPlatform={selectedPlatform}
                      autoPrompt={prompts["content"]}
                    />
                  </TabsContent>

                  <TabsContent value="Captions">
                    <Captions
                      captions={captions}
                      setCaptions={setCaptions}
                      selectedPost={selectedSlidePost}
                      setSelectedPost={() => { }}
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
            {!isFetchingUrls && selectedSlidePost.mediaUrl && (
              <PreviewPanel
                // key={`${convertedPost.mainId}-${selectedMediaIndex}`}
                key={previewKey}
                post={selectedSlidePost}
                ratios={ratios}
                setRatios={setRatios}
                selectedPlatform={selectedPlatform}
                setSelectedPlatform={setSelectedPlatform}
                resizedAspect={resizedAspect}
                setResizedAspect={setResizedAspect}
                updatedMedia={updatedMedia}
                setUpdatedMedia={setUpdatedMedia}
                isCarousel={true}
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