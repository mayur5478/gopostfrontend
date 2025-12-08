"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Pencil,
  Download,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaPlayCircle,
} from "react-icons/fa";
import All from "../../Tabs/AllTab/All";
import Approved from "../../Tabs/Approved";
import Published from "../../Tabs/Published";
import Unpublished from "../../Tabs/Unpublished";
import Scheduled from "../../Tabs/Scheduled";
import { CalendarSync, Laptop } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { use, useEffect, useState } from "react";
import { AGENT_URLS, MEDIA_ENGINE_URLS } from "@/lib/urls";
import { AgentData, DestinationPlatform, Settings } from "../../../list/types";
import mapAgentList from "../../../list/mapAgentList";
import { CarouselPostDetails, PostType } from "../../../create/types";
import toast from "react-hot-toast";

export default function ViewAgentClient() {
  console.log("Inside page.tsx of viewagent");

  // Helper function to get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "facebook":
        return <FaFacebook className="h-6 w-6 text-blue-600 text-[14px]" />;
      case "instagram":
        return <FaInstagram className="h-6 w-6 text-pink-500 text-[14px]" />;
      case "linkedin":
        return <FaLinkedin className="h-6 w-6 text-blue-700 text-[14px]" />;
      case "youtube":
        return <FaYoutube className="h-6 w-6 text-red-600 text-[14px]" />;
      default:
        return <FaPlayCircle className="h-6 w-6 text-gray-600 text-[14px]" />;
    }
  };

  const [agent, setAgent] = useState<AgentData>();
  const [selectedPosts, setSelectedPosts] = useState<PostType[]>([]);
  const [selectedCPosts, setSelectedCPosts] = useState<CarouselPostDetails[]>(
    []
  );
  const params = useParams();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(agent?.name);

  const handleBackClick = () => router.push("/agents/list");
  console.log(params.id);
  useEffect(() => {
    async function fetchAgents() {
      try {
        const { data } = await api.get(
          AGENT_URLS.VIEW_AGENT(params.id as string)
        );
        console.log("data here for posts", data);
        let agent: AgentData = mapAgentList(data);
        setAgent(agent);
        //   console.log("response data here",data);
      } catch (err) {
        console.error("Failed to fetch agents:", err);
      } finally {
      }
    }
    fetchAgents();
  }, [refreshKey, isEditingName]);

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

const saveName=async()=> {
  try{
    const payload = {
      name: tempName
    };
    const {data} = await api.patch(AGENT_URLS.VIEW_AGENT(params.id as string),payload)
        console.log("patch for editing agent name result", data.name);
  }
  catch(err){
    console.error("Agent edit name failed ", err);
  }
  finally{
  setIsEditingName(false);
  }
}

function cancelEdit() {
  setTempName(agent?.name);
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
      {agent.name}
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
        setTempName(agent.name);   // set default text
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
              <Badge className="bg-[#E7FBE0] text-[#43A92C] !px-1 !py-0 !text-[12px] rounded-md w-fit h-fit">
                {agent.status}
              </Badge>
            </div>
            <div className="Users inline-flex gap-2 justify-start ">
              {agent.destinationPlatforms
                .filter(
                  (platform: DestinationPlatform) =>
                    platform.status === "active"
                )
                .map((platform: DestinationPlatform, index: number) => (
                  <Button key={index} variant="outline">
                    {getPlatformIcon(platform.platform)}@{platform.account_name}
                  </Button>
                ))}
            </div>
          </div>
          <div className="importContent ml-auto pt-[10px] pr-4 pb-[10px] pl-4 gap-[6px]">
            <p>import content</p>
            <Button
              variant="outline"
              className="pt-[10px] pr-4 pb-[10px] pl-4 gap-[6px]"
            >
              <Download className="mr-2 h-4 w-4" />
              Import
            </Button>
          </div>
        </div>
        <div className="TabsAndButtons w-full">
          {/* <div className="tabs"> */}
          <Tabs defaultValue="All" className="w-full">
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
                  Unpublished
                </TabsTrigger>
                <TabsTrigger
                  value="Failed"
                  className="rounded-none border-b-2 border-transparent text-[#5B5B64]
                   data-[state=active]:border-b-black data-[state=active]:text-black 
                   data-[state=inactive]:hover:text-black"
                >
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
                Auto Schedule
              </Button>
            </div>
            <div className="mt-4">
              <TabsContent value="All">
                <All
                  key={refreshKey}
                  refreshKey={refreshKey}
                  AgentData={agent}
                  selectedPosts={selectedPosts}
                  setSelectedPosts={setSelectedPosts}
                  selectedCPosts={selectedCPosts}
                  setSelectedCPosts={setSelectedCPosts}
                />
              </TabsContent>
              <TabsContent value="Approved">
                <Approved                   key={refreshKey}
                  refreshKey={refreshKey}
                  AgentData={agent}
                  selectedPosts={selectedPosts}
                  setSelectedPosts={setSelectedPosts}/>
              </TabsContent>
              <TabsContent value="Scheduled">
                <Scheduled                   key={refreshKey}
                  refreshKey={refreshKey}
                  AgentData={agent}
                  selectedPosts={selectedPosts}
                  setSelectedPosts={setSelectedPosts} />
              </TabsContent>
              <TabsContent value="Published">
                <Published />
              </TabsContent>
              <TabsContent value="Unpublished">
                <Unpublished />
              </TabsContent>
              <TabsContent value="Failed">Failed</TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    )
  );
}
