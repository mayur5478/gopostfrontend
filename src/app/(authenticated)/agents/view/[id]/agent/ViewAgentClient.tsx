"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Pencil,
  Download,
  MonitorSmartphone
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaPlayCircle,
  FaGoogleDrive,
} from "react-icons/fa";
import All from "../../Tabs/AllTab/All";
import Approved from "../../Tabs/Approved";
import Published from "../../Tabs/Published";
import Unpublished from "../../Tabs/Unpublished";
import Scheduled from "../../Tabs/Scheduled";
import { CalendarSync, Laptop } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { useEffect, useState } from "react";
import { AGENT_URLS, CHANNEL_URL, MEDIA_ENGINE_URLS } from "@/lib/urls";
import { AgentData, Settings } from "../../../list/types";
import mapAgentList from "../../../list/mapAgentList";
import { AccountType, CarouselPostDetails, PostType } from "../../../create/types";
import toast from "react-hot-toast";
import ImportFromLibraryButton from "./ImportFromLibraryButton"
import { MediaItem } from "../../../create/components/LibraryImportModal";
import { BiSolidChevronsRight } from "react-icons/bi";
import { IconType } from "react-icons";

export default function ViewAgentClient() {
  console.log("Inside page.tsx of viewagent");

  const [agent, setAgent] = useState<AgentData>();
  const [selectedPosts, setSelectedPosts] = useState<PostType[]>([]);
  const [selectedCPosts, setSelectedCPosts] = useState<CarouselPostDetails[]>(
    []
  );
  const [agentName, setAgentName] = useState<string>("");
  const params = useParams<{ id?: string }>();
  const agentId = params?.id;
  const router = useRouter();
  const searchParams = useSearchParams(); // Added useSearchParams
  
  const [refreshKey, setRefreshKey] = useState(0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [sourceIcon, setSourceIcon] = useState<React.JSX.Element>(<div></div>);
  const [destIcons, setDestIcons] = useState<React.JSX.Element[]>([]);
  const [sourcePlatform, setSourcePlatfrom] = useState<string>("");
  
  // Tab State
  const [activeTab, setActiveTab] = useState("All");

  // Check for focusPost in URL and switch to Scheduled tab if present
  useEffect(() => {
    const focusPostId = searchParams.get('focusPost');
    if (focusPostId) {
      setActiveTab("Scheduled");
      // Optional: Add logic here to scroll to the post with ID `focusPostId` if your sub-components support refs or ids
    }
  }, [searchParams]);

  const getIconAndColor = (
    channel: string
  ): { Icon: IconType | null; color: string } => {
    const Icon =
      channel === "facebook"
        ? FaFacebook
        : channel === "google"
          ? FaGoogleDrive
          : channel === "linkedin"
            ? FaLinkedin
            : channel === "youtube"
              ? FaYoutube
              : null;
    const color =
      channel === "facebook"
        ? 'text-blue-600'
        : channel === "google"
          ? 'text-green-600'
          : channel === "linkedin"
            ? 'text-[#0077B5]'
            : channel === "youtube"
              ? 'text-red-600'
              : "";

    return {
      Icon: Icon,
      color: color

    }
  }
  const SourceLocal = () => (
    <div className="relative w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm">
      <MonitorSmartphone className="text-gray-600 w-5 h-5 absolute" style={{ top: "6px", right: "5px" }} />
    </div>
  )
  const handleBackClick = () => router.push("/agents/list");
  console.log(params.id);
  useEffect(() => {

    async function fetchAgents() {
      if (!agentId) return;
      try {
        let channel = await api.get(CHANNEL_URL.GET_CHANNEL);
        console.log("get all channels", channel.data.results);

        const { data } = await api.get(
          AGENT_URLS.VIEW_AGENT(agentId)
        );
        console.log("data here for posts", data);
        let agent: AgentData = mapAgentList(data, channel.data.results);
        setAgent(agent);
        setAgentName(agent.name);
        setTempName(agent.name);

        //   console.log("response data here",data);
      } catch (err) {
        console.error("Failed to fetch agents:", err);
      } finally {
      }
    }
    fetchAgents();
  }, [refreshKey])//  , isEditingName]);


  useEffect(() => {
    if (!agent) return;

    const platform = agent.source;
    // Set source icon
    if (platform === "local") {
      setSourceIcon(<SourceLocal />);
    } else {
      const { Icon, color } = getIconAndColor(platform);
      if (Icon) {
        setSourceIcon(
          <div className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 shadow-sm">
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        );
      }
    }
    //Set destination icons
    const icons = agent.destinationPlatforms.map((ch) => {
      const { Icon, color } = getIconAndColor(ch.channel_type);
      return Icon ? <Icon key={ch.id} className={`w-5 h-5 ${color}`} /> : null;
    });

    setDestIcons(icons.filter(Boolean) as React.ReactElement[]);
  }, [agent]);

  const addPostsToAgent = async (newPosts: PostType[]) => {
    console.log("inside add post for agent", newPosts);

    if (!params.id) {
      toast.error("Agent ID missing. Cannot upload posts.");
      return;
    }

    if (!agent?.destinationPlatforms?.length) {
      toast.error("No accounts selected.");
      return;
    }

    try {
      const postCreationPromises = newPosts.map((post) => {
        // Determine usable media URL
        const masterMediaUrl = post.fileKey || post.mediaUrl;
        if (!masterMediaUrl) {
          console.warn("Skipping post because media is missing:", post.mainId);
          return Promise.resolve();
        }

        // Safe fallback inner post (in case post.posts[] is empty)
        const defaultInner = {
          title: "Untitled",
          mediaUrl: masterMediaUrl,
          thumbnailUrl: masterMediaUrl,
          tags: [],
          resize: "square",
          caption: [],
          metadata: {},
        };

        const firstInner = post.posts?.[0] || defaultInner;

        //Build channel_posts for each selected platform
        const channelPosts = agent.destinationPlatforms.map((account) => {
          const inner =
            post.posts?.find((p) => p.platform?.id === account.id) ||
            firstInner;

          return {
            channel: account.id,
            title: inner.title || "Untitled",
            media_url: post.fileKey || inner.mediaUrl || masterMediaUrl,
            thumbnail_url: inner.thumbnailUrl || masterMediaUrl,
            tags: inner.tags || [],
            resize: inner.resize || "square",
            caption: inner.caption || [],
            metadata: inner.metadata || {},
          };
        });

        // Master post payload for backend
        const payload = {
          original_media_url: masterMediaUrl,
          channel_posts: channelPosts,
        };

        return api.post(AGENT_URLS.POSTS(agent.id), payload);
      });

      await Promise.allSettled(postCreationPromises);
      toast.success("Posts added successfully!");
    } catch (error: any) {
      console.error("Error adding posts:", error);

      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error.message ||
        "Failed to add posts. Try again.";

      toast.error(msg);
    }
    finally {
      setRefreshKey((prev) => prev + 1);

    }
  };


  async function handleSmartSchedule(
    selectedPosts: PostType[] | CarouselPostDetails[]
  ) {
    if (agent?.type == "create_carousel_or_slider") {
      if (!selectedCPosts.length) {
        toast.error("Please select at least one post before scheduling.");
        return;
      }
      try {
        // --- Build flattened payload for smart scheduler ---
        const postsPayload = selectedCPosts.flatMap((post) =>
          post.posts.map((p) => ({
            id: p.postId, // channel_post ID
            platform: p.platform?.channel_type?.toLowerCase() ?? "unknown",
          }))
        );

        if (!postsPayload.length) {
          toast.error("No valid posts found for scheduling.");
          return;
        }

        // --- Call the Smart Scheduler API ---
        const payload = { posts: postsPayload };
        console.log("Smart Scheduler Payload:", payload);

        const response = await api.post(MEDIA_ENGINE_URLS.SMART_SCHEDULE, payload);
        console.log(" Smart scheduling successful:", response.data);

        toast.success("Smart schedule generated successfully!");

        // --- Apply schedules to each master post ---
        for (const masterPost of selectedCPosts) {
          // Build channel_posts array for PATCH
          const channel_posts = masterPost.posts.map((p) => {
            const matched = response.data.schedule.find(
              (s: any) => s.id === p.postId
            );
            return {
              post_id: p.postId,
              scheduled_time: matched ? matched.post_time_utc : null,
              channel: p.platform.id,
            };
          });

          const patchPayload = {
            id: masterPost.mainId,
            agent: masterPost.agent,
            channel_posts,
          };

          console.log(" PATCH payload for:", masterPost.mainId, patchPayload);

          try {
            const patchResponse = await api.patch(
              AGENT_URLS.PATCH_POST(masterPost.agent, masterPost.mainId),
              patchPayload
            );
            console.log("Post scheduled successfully:", patchResponse.data);
          } catch (patchErr) {
            console.error(" Error patching schedule:", patchErr);
            toast.error(`Failed to schedule post ${masterPost.mainId}.`);
          }
        }

        toast.success("All posts scheduled successfully!");
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        console.error(" Smart Scheduler failed:", error);
        toast.error("Failed to generate smart schedule.");
      }
      return;
    }
    if (!selectedPosts.length) {
      toast.error("Please select at least one post before scheduling.");
      return;
    }

    try {
      // --- Build flattened payload for smart scheduler ---
      const postsPayload = selectedPosts.flatMap((post) =>
        post.posts.map((p) => ({
          id: p.postId, // channel_post ID
          platform: p.platform?.channel_type?.toLowerCase() ?? "unknown",
        }))
      );

      if (!postsPayload.length) {
        toast.error("No valid posts found for scheduling.");
        return;
      }

      // --- Call the Smart Scheduler API ---
      const payload = { posts: postsPayload };
      console.log("Smart Scheduler Payload:", payload);

      const response = await api.post(MEDIA_ENGINE_URLS.SMART_SCHEDULE, payload);
      console.log(" Smart scheduling successful:", response.data);

      toast.success("Smart schedule generated successfully!");

      // --- Apply schedules to each master post ---
      for (const masterPost of selectedPosts) {
        // Build channel_posts array for PATCH
        const channel_posts = masterPost.posts.map((p) => {
          const matched = response.data.schedule.find(
            (s: any) => s.id === p.postId
          );
          return {
            post_id: p.postId,
            scheduled_time: matched ? matched.post_time_utc : null,
            channel: p.platform.id,
          };
        });

        const patchPayload = {
          id: masterPost.mainId,
          agent: masterPost.agent,
          channel_posts,
        };

        console.log(" PATCH payload for:", masterPost.mainId, patchPayload);

        try {
          const patchResponse = await api.patch(
            AGENT_URLS.PATCH_POST(masterPost.agent, masterPost.mainId),
            patchPayload
          );
          console.log("Post scheduled successfully:", patchResponse.data);
        } catch (patchErr) {
          console.error(" Error patching schedule:", patchErr);
          toast.error(`Failed to schedule post ${masterPost.mainId}.`);
        }
      }

      toast.success("All posts scheduled successfully!");
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error(" Smart Scheduler failed:", error);
      toast.error("Failed to generate smart schedule.");
    }
  }

const saveName = async () => {
  try {
    const payload = { name: tempName };

    const response = await api.patch(
      AGENT_URLS.VIEW_AGENT(params.id as string),
      payload
    );

    // 🔥 Optimistic UI update – no posts refresh
// setAgent(prev =>
//   prev ? { ...prev, name: tempName } : prev
// );
setAgentName(tempName);

    console.log("Updated name:", response.data.name);

  } catch (err) {
    console.error("Agent edit name failed ", err);
    toast.error("Failed to update agent name");
  } finally {
    setIsEditingName(false);
  }
};


  function cancelEdit() {
    if(agent){
    setTempName(agentName??agent.name);
    }
    else{
      setTempName("");
    }
    setIsEditingName(false);
  }

  return (
    agent && (
      <div className="view">
        <div className="inline-block border-b-1 border[##0D0D0D1A] w-full h-fit p-[0.6rem] ">
          <div className="agentNameBox flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="w-fit h-fit p-1"
              onClick={handleBackClick}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {!isEditingName ? (
              <div className="inline-block font-semibold text-[20px] leading-[100%] tracking-[-0.21px]">
                {agentName}
              </div>
            ) : (
              <input
                autoFocus
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    saveName();
                  } else if (e.key === "Escape") {
                    cancelEdit();
                  }
                }}
                onBlur={cancelEdit}
                className="border border-gray-300 rounded px-2 py-1 text-[18px] font-semibold"
              />
            )}
            {!isEditingName && (
              <Button
                variant="outline"
                className="w-fit h-fit px-1 py-1 border-0"
                onClick={() => {
                  setTempName(agentName?? agent.name);   // set default text
                  setIsEditingName(true);
                }}
              >
                <Pencil size="14" />
              </Button>
            )}
            <Button
              variant="outline"
              className="ml-auto pt-[10px] pr-4 pb-[10px] pl-4 gap-[6px]"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Agent
            </Button>
          </div>
        </div>
        <div className="flex p-2">
          <div className="flex flex-col gap-2">
            <div className="AgetnTypeAndStatus inline-flex gap-2 items-center">
              <div className="text-[18px] text-[#5B5B64]">{agent.type}</div>
              <Badge className="text-[#A66000] bg-[#FEFCE8] !px-1 !py-0 !text-[12px] rounded-md w-fit h-fit capitalize">
                {agent.status}
              </Badge>
            </div>
            <div className="w-fit flex gap-2">
              <div className="w-fit">
                {sourceIcon}
              </div>
              <BiSolidChevronsRight style={{ color: "#18181829" }} className="w-8 h-8 bg-gray text-gray"></BiSolidChevronsRight>
              <div className="flex items-center w-fit">
                {destIcons.map((icon, index) => (
                  <div
                    key={index}
                    className={`
                    w-8 h-8 rounded-full border border-gray-200 bg-white shadow-sm 
                    flex items-center justify-center
                    ${index !== 0 ? "-ml-2" : ""}
                  `}
                    style={{ zIndex: index + 1 }}
                  >
                    {icon}
                  </div>
                ))}
              </div>

            </div>
            <div className="Users inline-flex gap-2 justify-start ">
              {/* {agent.destinationPlatforms
                .filter(
                  (platform: DestinationPlatform) =>
                    platform.status === "active"
                )
                .map((platform: DestinationPlatform, index: number) => (
                  <Button key={index} variant="outline">
                    {getPlatformIcon(platform.platform)}@{platform.account_name}
                  </Button>
                ))} */}
            </div>
          </div>
          <div className="importContent ml-auto pr-4 pb-[10px] pl-4 gap-[6px]">
            {/* <p>import content</p> */}
            {/* <Button
              variant="outline"
              className="pt-[5px] pr-4 pb-[5px] pl-4 gap-[6px]"
            >
              <Download className="mr-2 h-4 w-4" />
              Import
            </Button> */}

            <ImportFromLibraryButton
              selectedAccounts={agent.destinationPlatforms}
              onImport={(newPosts) => { addPostsToAgent(newPosts) }}
              className="pt-[5px] pr-4 pb-[5px] pl-4 gap-[6px]"
              text="Import" />

            {/* <Download className="mr-2 h-4 w-4" /> */}
          </div>
        </div>
        <div className="TabsAndButtons w-full mt-4">
          {/* <div className="tabs"> */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between ">
              {/* //border-b border-gray-200 */}
              <TabsList className="flex border-b w-fit justify-start bg-transparent p-0 h-fit gap-3 ml-[1.5rem]">
                <TabsTrigger
                  value="All"
                  className="rounded-none border-b-2 border-transparent text-[#5B5B64]
                   data-[state=active]:border-b-black data-[state=active]:text-black 
                   data-[state=inactive]:hover:text-black"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="Approved"
                  className="rounded-none border-b-2 border-transparent text-[#5B5B64] data-[state=active]:border-b-black data-[state=active]:text-black data-[state=inactive]:hover:text-black"
                >
                  {" "}
                  Approved
                </TabsTrigger>
                <TabsTrigger
                  value="Scheduled"
                  className="rounded-none border-b-2 border-transparent text-[#5B5B64]
                   data-[state=active]:border-b-black data-[state=active]:text-black 
                   data-[state=inactive]:hover:text-black"
                >
                  Scheduled
                </TabsTrigger>
                <TabsTrigger
                  value="Published"
                  className="rounded-none border-b-2 border-transparent text-[#5B5B64]
                   data-[state=active]:border-b-black data-[state=active]:text-black 
                   data-[state=inactive]:hover:text-black"
                >
                  Published
                </TabsTrigger>
                <TabsTrigger
                  value="Unpublished"
                  className="rounded-none border-b-2 border-transparent text-[#5B5B64]
                   data-[state=active]:border-b-black data-[state=active]:text-black 
                   data-[state=inactive]:hover:text-black"
                >
                  {/* Unpublished
                </TabsTrigger>
                <TabsTrigger
                  value="Failed"
                  className="rounded-none border-b-2 border-transparent text-[#5B5B64]
                   data-[state=active]:border-b-black data-[state=active]:text-black 
                   data-[state=inactive]:hover:text-black"
                > */}
                  Failed
                </TabsTrigger>
              </TabsList>
              <Button
                variant="outline"
                onClick={() => {
                  handleSmartSchedule(selectedPosts);
                }}
                className="mr-[1.5rem]"
              >
                <CalendarSync className="w-4 h-4"></CalendarSync>
                Auto Schedule
              </Button>
            </div>
            <div className="mt-4">
              <TabsContent value="All" className="flex flex-col min-h-[60vh]">
                <All
                  // key={refreshKey}
                  refreshKey={refreshKey}
                  onRefresh={() => setRefreshKey(prev => prev + 1)}   // NEW
                  AgentData={agent}
                  selectedPosts={selectedPosts}
                  setSelectedPosts={setSelectedPosts}
                  selectedCPosts={selectedCPosts}
                  setSelectedCPosts={setSelectedCPosts}
                />
              </TabsContent>
              <TabsContent value="Approved" className="flex flex-col min-h-[60vh]">
                <Approved 
                // key={refreshKey}
                  onRefresh={() => setRefreshKey(prev => prev + 1)}   // NEW
                  refreshKey={refreshKey}
                  AgentData={agent}
                  selectedPosts={selectedPosts}
                  setSelectedPosts={setSelectedPosts} />
              </TabsContent>
              <TabsContent value="Scheduled" className="flex flex-col min-h-[60vh]">
                <Scheduled 
                // key={refreshKey}
                  onRefresh={() => setRefreshKey(prev => prev + 1)}   // NEW
                  refreshKey={refreshKey}
                  AgentData={agent}
                  selectedPosts={selectedPosts}
                  setSelectedPosts={setSelectedPosts} />
              </TabsContent>
              <TabsContent value="Published" className="flex flex-col min-h-[60vh]">
                <Published />
              </TabsContent>
              {/* <TabsContent value="Unpublished">
                <Unpublished />
              </TabsContent> */}
              <TabsContent value="Failed" className="flex flex-col min-h-[60vh]">Failed</TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    )
  );
}