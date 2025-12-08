"use client";

import { useState, useEffect, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit3, MoreHorizontal, Check, Loader2 } from "lucide-react";
import FirstStep from "./components/FirstStep";
import SecondStep from "./components/SecondStep";
import SecondStepCrossPost from "./components/SecondStepCrossPost";
import ThirdStep from "./components/ThirdStep";
import ThirdStepCrossPost from "./components/ThirdStepCrossPost";
import { toast } from "react-hot-toast";
import api from "@/lib/axios";
import {
  PostType,
  AgentSettings,
  AccountType,
  CarouselPost,
  SourcePost,
} from "./types";
import { AGENT_URLS, CHANNEL_URL } from "@/lib/urls";
import { Workspace } from "@/components/ui/sidebar";

export default function CreateAgent() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedAgentType, setSelectedAgentType] = useState<string | null>(
    "post_from_computer"
  );
  const [agentSettings, setAgentSettings] = useState<AgentSettings>({
    "Auto Create Meta Data": false,
    "Auto Approve Meta Data": false,
    "Auto-Resize": false,
    "AI Captions": false,
    "Smart Schedule": false,
    "Auto-Fetch": false,
  });

  const [allAccounts, setAllAccounts] = useState<AccountType[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<AccountType[]>([]);

  const [sourceAccount, setSourceAccount] = useState<AccountType | null>(null);
  const [selectedCrossPosts, setSelectedCrossPosts] = useState<SourcePost[]>([]);

  const [posts, setPosts] = useState<PostType[]>([]);
  const [carouselPosts, setCarouselPosts] = useState<CarouselPost[]>([]);

  const [isAccountSelected, setIsAccountSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, setValue, watch } = useForm({
    defaultValues: {
      agentName: "",
      agentType: "post_from_computer",
    },
  });
  const agentName = watch("agentName");

  const generateDefaultAgentName = () => {
    const adjectives = ["Smart", "Social", "Growth", "Creative", "Dynamic"];
    const nouns = ["Agent", "Scheduler", "Publisher", "Assistant", "Manager"];

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const suffix = Math.floor(1000 + Math.random() * 9000);

    return `${adj} ${noun} ${suffix}`;
  };

  useEffect(() => {
    const current = watch("agentName");
    if (!current) {
      const defaultName = generateDefaultAgentName();
      setValue("agentName", defaultName);
    }
  }, [setValue]);

  const agentTypes = [
    {
      id: "post_from_computer",
      title: "Post from My Computer",
      description: "Upload and share content directly from your device.",
      icon: "/post-from-computer.png",
    },
    {
      id: "cross_post",
      title: "Cross-Post Across Socials",
      description:
        "Republish content from one platform to many in a single step.",
      icon: "/cross-post-across-socials.png",
    },
    {
      id: "create_carousel_or_slider",
      title: "Create Carousel or slider",
      description:
        "Use our carousel or slider to explore all publishing options at a glance.",
      icon: "/create-carousal-or-slider.png",
    },
  ];

  const handleBackStepClick = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setCompletedSteps((prev) =>
        prev.filter((step) => step < currentStep - 1)
      );
    }
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await api.get("channels/");
        if (response.data.results && response.data.count > 0) {
          const mappedAccounts: AccountType[] = response.data.results.map(
            (channel: any) => ({
              id: channel.id,
              connection_id: channel.connection,
              channel_type: channel.channel_type,
              username: channel.username || channel.name || "Unknown",
              created_at: channel.created_at,
              updated_at: channel.updated_at,
              status: channel.status === "active",
              user: channel.user,
            })
          );
          setAllAccounts(mappedAccounts);
        } else {
          setAllAccounts([]);
        }
      } catch (error) {
        console.error("Error Fetching Accounts:", error);
        toast.error("Failed to load connected accounts.");
        setAllAccounts([]);
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAgentType === "cross_post") {
      setIsAccountSelected(!!sourceAccount && selectedAccounts.length > 0);
    } else if (selectedAgentType === "gopost_ai") {
      setIsAccountSelected(true);
    } else {
      setIsAccountSelected(selectedAccounts.length > 0);
    }
  }, [selectedAccounts, sourceAccount, selectedAgentType]);

  useEffect(() => {
    setSourceAccount(null);
    setSelectedAccounts([]);
    setIsAccountSelected(false);
    setPosts([]);
    setCarouselPosts([]);
    setSelectedCrossPosts([]);
  }, [selectedAgentType]);

  const steps = [
    { id: 1, title: "Choose Agent Type" },
    { id: 2, title: "Select Platforms" },
    { id: 3, title: "Add Your Content" },
  ];

  const handleBackClick = () => router.push("/agents/list");
  const handleEditNameClick = () => setIsEditingName(true);
  const handleAgentNameSave = () => {
    setIsEditingName(false);
  };
  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingName(false);
  };

  const getStepStatus = (stepId: number) => {
    if (completedSteps.includes(stepId)) return "completed";
    if (stepId === currentStep) return "active";
    return "pending";
  };

  const getStepStyles = (status: string) => {
    switch (status) {
      case "completed":
        return { circle: "bg-[#FDE047]", text: "text-[#181818]" };
      case "active":
        return { circle: "bg-[#FDE047] animate-pulse", text: "text-[#181818]" };
      default:
        return {
          circle: "bg-white border-2 border-[#00000114]",
          text: "text-gray-400",
        };
    }
  };

  const createAgent = async () => {
    const selectedWorkspaceStr = localStorage.getItem("selectedWorkspace");
    if (!selectedWorkspaceStr) {
      toast.error(
        "No workspace selected. Please select or create a workspace from the sidebar."
      );
      return;
    }

    const selectedWorkspace: Workspace = JSON.parse(selectedWorkspaceStr);
    const selectedChannelIds = selectedAccounts.map((account) => account.id);

    // --- Pre-API Validations ---
    if (selectedAgentType === "cross_post") {
      if (!sourceAccount) {
        toast.error("Please select a source account.");
        return;
      }
      if (selectedChannelIds.length === 0) {
        toast.error("Please select at least one destination platform.");
        return;
      }
      if (selectedCrossPosts.length === 0) {
        toast.error("Please select at least one post to cross-post.");
        return;
      }
    } else if (selectedAgentType === "gopost_ai") {
      toast.error("GoPost AI agent creation is not yet implemented.");
      return;
    } else {
      // Post from Computer / Carousel
      if (selectedChannelIds.length === 0) {
        toast.error("Please select at least one destination platform/channel.");
        return;
      }

      const isCarousel = selectedAgentType === "create_carousel_or_slider";
      const allMediaItems: any[] = isCarousel
        ? carouselPosts.flatMap((p) => p.media)
        : posts;

      if (
        allMediaItems.some(
          (item) => item.posts && item.posts[0].status !== "uploaded"
        )
      ) {
        toast.error("Please wait for all file uploads to complete.");
        return;
      }

      if (isCarousel) {
        if (allMediaItems.some((item) => !item.mediaUrl)) {
          toast.error(
            "Some carousel media items are missing a URL. Please try re-uploading."
          );
          return;
        }
      } else {
        const libraryWithNoUrlOrKey = allMediaItems.some((item) => {
          return !item.mediaUrl && !item.fileKey;
        });
        if (libraryWithNoUrlOrKey) {
          toast.error(
            "Some content items are invalid (missing file info). Please re-add them."
          );
          return;
        }
      }

      const contentExists = isCarousel
        ? carouselPosts.some((cp) => cp.media.length > 0)
        : posts.length > 0;
      if (!contentExists) {
        toast.error("Please add content before creating the agent.");
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    let agentId: string | null = null;
    try {
      const sourceConnectionId =
        selectedAgentType === "cross_post" && sourceAccount
          ? sourceAccount.id
          : null;

      const agentPayload: any = {
        name: agentName,
        type: selectedAgentType,
        status: "draft",
        source_channel: sourceConnectionId, // Changed to match backend field name 'source_channel'
        auto_fetch: agentSettings["Auto-Fetch"],
        auto_approve_metadata: agentSettings["Auto Approve Meta Data"],
        auto_create_metadata: agentSettings["Auto Create Meta Data"],
        auto_resize: agentSettings["Auto-Resize"],
        ai_captions: agentSettings["AI Captions"],
        smart_schedule: agentSettings["Smart Schedule"],
        workspace: selectedWorkspace.workspace_id,
      };

      console.log("Creating agent with payload:", agentPayload);
      const agentResponse = await api.post(
        AGENT_URLS.CREATE_AGENT,
        agentPayload
      );
      agentId = agentResponse.data.agent_id;

      if (!agentId) {
        throw new Error("Failed to get agent ID from the creation response.");
      }

      const validAgentId = agentId as string;

      // --- API Call 2: Create Posts based on Agent Type ---
      if (selectedAgentType === "cross_post") {
        
        // 1. Construct the payload for the NEW backend view
        // We send the full post objects so the backend has the URLs to download
        const crossPostPayload = {
            source_posts: selectedCrossPosts.map(p => ({
                id: p.id,
                title: p.title,
                description: p.description,
                mediaUrl: p.mediaUrl, // The external URL or internal Key
                thumbnailUrl: p.thumbnailUrl,
                hashtags: p.hashtags,
                type: p.type
            })),
            target_channel_ids: selectedChannelIds
        };

        // 2. Call the new endpoint that handles downloading
        await api.post(AGENT_URLS.CROSS_POST(validAgentId), crossPostPayload);

      } else if (
        selectedAgentType === "create_carousel_or_slider" &&
        carouselPosts.length > 0
      ) {
        const carouselPayload = {
          carousels: carouselPosts
            .map((cp) => {
              const mediaUrls = cp.media
                .map((m) => m.mediaUrl) // Use signed URLs or Keys depending on backend expectation for carousel
                .filter(Boolean) as string[];
              return { name: cp.name, media_urls: mediaUrls };
            })
            .filter((cp) => cp.media_urls.length > 0),
          target_channel_ids: selectedChannelIds,
        };

        if (carouselPayload.carousels.length > 0) {
          await api.post(
            AGENT_URLS.CAROUSEL_POSTS(validAgentId),
            carouselPayload
          );
        }
      } else if (
        selectedAgentType === "post_from_computer" &&
        posts.length > 0
      ) {
        const postCreationPromises = posts.map((post) => {
          const firstInner = post.posts[0];
          if (!firstInner) return Promise.resolve();

          const masterMediaUrl = post.fileKey || post.mediaUrl;

          if (!masterMediaUrl) {
            console.warn(
              "Skipping post due to missing mediaUrl/fileKey:",
              post.mainId
            );
            return Promise.resolve();
          }

          const channelPosts = selectedAccounts.map((account) => {
            const innerForAccount =
              post.posts.find((inner) => inner.platform.id === account.id) ||
              firstInner;

            // Prefer fileKey (S3 key) if available, else use mediaUrl
            const mediaUrlForChannel = post.fileKey || post.mediaUrl;

            return {
              channel: account.id,
              title: innerForAccount.title,
              media_url: mediaUrlForChannel, 
              thumbnail_url: "",
              tags: [],
              resize: "square",
              caption: [],
              metadata: innerForAccount.metadata || {},
            };
          });

          const masterPostPayload = {
            original_media_url: masterMediaUrl,
            channel_posts: channelPosts,
          };

          return api.post(AGENT_URLS.POSTS(validAgentId), masterPostPayload);
        });

        await Promise.allSettled(postCreationPromises);
      }

      toast.success("Agent created successfully!");
      router.push(`/agents/view/${validAgentId}/agent`);
    } catch (err: any) {
      console.error("Error creating agent/posts:", err);
      let errorMessage = "Failed to create agent or posts. Please try again.";
      if (err.response) {
        const data = err.response.data;
        if (data && typeof data === "object") {
          errorMessage =
            data.detail ||
            data.error ||
            (data.errors ? JSON.stringify(data.errors) : JSON.stringify(data));
        } else if (typeof data === "string") {
          errorMessage = data;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndContinue = () => {
    if (currentStep === 1 && !selectedAgentType) {
      toast.error("Please select an agent type.");
      return;
    }
    if (currentStep === 2 && !isAccountSelected) {
      if (selectedAgentType === "cross_post") {
        toast.error("Please select both a source and at least one destination.");
      } else if (selectedAgentType !== "gopost_ai") {
        toast.error("Please select at least one destination platform/channel.");
      }
      return;
    }

    if (currentStep === 3) {
      createAgent();
      return;
    }

    if (currentStep < steps.length) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps((prev) => [...prev, currentStep]);
      }
      setCurrentStep((prev) => prev + 1);
    }
  };

  const isStep3Complete = () => {
    if (selectedAgentType === "cross_post") {
      return selectedCrossPosts.length > 0;
    }
    if (selectedAgentType === "create_carousel_or_slider") {
      return (
        carouselPosts.length > 0 &&
        carouselPosts.every(
          (cp) =>
            cp.media.length > 0 &&
            cp.media.every((m) => m.posts[0].status === "uploaded")
        )
      );
    }
    if (selectedAgentType === "post_from_computer") {
      return (
        posts.length > 0 &&
        posts.every((p) => p.posts[0].status === "uploaded")
      );
    }
    if (selectedAgentType === "gopost_ai") {
      return true;
    }
    return false;
  };

  const isButtonDisabled = () => {
    if (isLoading) return true;
    if (currentStep === 2) return !isAccountSelected;
    if (currentStep === 3) return !isStep3Complete();
    return false;
  };

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col bg-white">
      {/* Header */}
      <div className="w-full pt-3 pr-6 pb-3 pl-3 flex items-center justify-between border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleBackClick}
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg border border-[#5B5B641A] p-1 hover:bg-gray-50"
          >
            <ArrowLeft size={20} color="#5B5B64" />
          </Button>
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <form
                onSubmit={handleNameSubmit}
                className="flex items-center gap-2"
              >
                <input
                  {...register("agentName", {
                    required: "Agent name cannot be empty.",
                  })}
                  className="text-lg md:text-xl font-semibold bg-transparent border-b border-gray-300 focus:outline-none focus:border-yellow-500 px-1 py-0 h-8"
                  autoFocus
                  onBlur={handleAgentNameSave}
                />
              </form>
            ) : (
              <>
                <span className="text-xl font-semibold">{agentName}</span>
                <Button
                  onClick={handleEditNameClick}
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 hover:bg-gray-100 rounded !p-0"
                >
                  <Edit3 size={20} color="#5B5B64" />
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-gray-200 p-2 flex items-center justify-center cursor-pointer hover:bg-gray-100">
          <MoreHorizontal size={18} color="#5B5B64" />
        </div>
      </div>

      {/* Steps */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ height: "calc(100vh - 130px)" }}
      >
        <div className="w-full flex justify-center mt-8">
          <div className="flex items-center">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id);
              const styles =
                getStepStyles(status) || {
                  circle: "bg-white border-2 border-[#00000114]",
                  text: "text-gray-400",
                };
              return (
                <div key={step.id} className="flex items-center">
                  <div className="gap-2 flex items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${styles.circle}`}
                    >
                      {status === "completed" && (
                        <Check size={12} color="#181818" strokeWidth={2.5} />
                      )}
                    </div>
                    <span className={`text-base font-medium ${styles.text}`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-14 h-0 border-t border-dashed border-[#5B5B64] mx-3" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="px-4 md:px-6 pb-6 mt-6">
          {currentStep === 1 && (
            <FirstStep
              selectedAgentType={selectedAgentType}
              setSelectedAgentType={(type: SetStateAction<string | null>) => {
                const resolvedType =
                  typeof type === "function" ? type(selectedAgentType) : type;
                setSelectedAgentType(resolvedType);
                const agentTypeValue: string = (resolvedType ??
                  "post_from_computer") as string;
                setValue("agentType", agentTypeValue);
              }}
              agentTypes={agentTypes}
              setValue={setValue}
            />
          )}

          {currentStep === 2 && (
            <>
              {selectedAgentType === "cross_post" ? (
                <SecondStepCrossPost
                  sourceAccount={sourceAccount}
                  setSourceAccount={setSourceAccount}
                  agentSettings={agentSettings}
                  setAgentSettings={setAgentSettings}
                  selectedAccounts={selectedAccounts}
                  setSelectedAccounts={setSelectedAccounts}
                  accountsData={allAccounts}
                  isAccountSelected={isAccountSelected}
                  setIsAccountSelected={setIsAccountSelected}
                />
              ) : (
                <SecondStep
                  agentSettings={agentSettings}
                  setAgentSettings={setAgentSettings}
                  selectedAccounts={selectedAccounts}
                  setSelectedAccounts={setSelectedAccounts}
                  accountsData={allAccounts}
                  isAccountSelected={isAccountSelected}
                  setIsAccountSelected={setIsAccountSelected}
                />
              )}
            </>
          )}

          {currentStep === 3 && (
            <>
              {selectedAgentType === "cross_post" ? (
                <ThirdStepCrossPost
                  sourceAccount={sourceAccount}
                  selectedCrossPosts={selectedCrossPosts}
                  setSelectedCrossPosts={setSelectedCrossPosts}
                />
              ) : (
                <ThirdStep
                  agentType={selectedAgentType}
                  posts={posts}
                  setPosts={setPosts}
                  carouselPosts={carouselPosts}
                  setCarouselPosts={setCarouselPosts}
                  selectedAccounts={selectedAccounts}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="w-full flex justify-center flex-shrink-0 bg-white border-t border-gray-200 shadow-[0_-2px_4px_rgba(0,0,0,0.04)]">
        <div className="w-full max-w-4xl px-6 py-4 md:px-8 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="px-5 py-2 md:px-6 md:py-2.5 rounded-lg border-[#D1D5DB] text-[#374151] hover:bg-gray-50"
            onClick={handleBackStepClick}
            disabled={currentStep === 1 || isLoading}
          >
            Back
          </Button>
          <Button
            variant="default"
            className="px-5 py-2 md:px-6 md:py-2.5 rounded-lg bg-[#FDE047] hover:bg-[#FCD34D] text-black font-semibold disabled:opacity-60"
            onClick={handleSaveAndContinue}
            disabled={isButtonDisabled()}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading
              ? currentStep === 3
                ? "Creating Agent..."
                : "Saving..."
              : currentStep === 3
              ? "Create Agent"
              : "Save and Continue"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="w-full bg-red-50 text-red-700 py-2 px-6 text-center text-sm flex-shrink-0">
          {error}
        </div>
      )}
    </div>
  );
}