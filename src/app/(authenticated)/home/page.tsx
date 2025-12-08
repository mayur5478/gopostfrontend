"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Zap } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { FaFacebook, FaInstagram, FaLinkedin, FaYoutube } from "react-icons/fa";
import { SiGoogledrive, SiTiktok } from "react-icons/si";
import { FileChartColumnIncreasing } from "lucide-react";
import { Calendar } from "lucide-react";
import { BsStars } from "react-icons/bs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SocialNetworkImage from "../../../../public/SocialNetworkImage.svg"
import Image from "next/image";
import { AgentData,Settings } from "../agents/list/types";
import AgentCard from "../agents/list/AgentCard"
import { AGENT_URLS, CHANNEL_URL } from "@/lib/urls";
import api from "@/lib/axios"
import mapAgentList from "../agents/list/mapAgentList";

export default function Home() {
  const [greeting, setGreeting] = useState("");
  const [totalNoOfPosts, setTotalNoOfPosts] = useState(0);
  const [engagement, setEngagement] = useState(0);
  const [noOfNewFollowers, setNoOfNewFollowers] = useState(0);
  useEffect(() => {
    const date = new Date();
    const hours = date.getHours();
    let message = "";
    if (hours >= 5 && hours < 12) {
      message = "Good morning";
    } else if (hours >= 12 && hours < 17) {
      message = "Good afternoon";
    } else if (hours >= 17 && hours < 21) {
      message = "Good evening";
    } else {
      message = "Good night";
    }
    setGreeting(message);
  }, []);

  let userName = "GoPostUser";
  const router = useRouter();
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);

  // get all agents and set agents 
  useEffect(() => {
    async function fetchAgents() {
      try {
        let channel = await api.get(CHANNEL_URL.GET_CHANNEL);
        console.log("get all channels", channel.data.results);
        const { data } = await api.get(AGENT_URLS.GET_AGENTS);
        if (data && data.results) {
          let newAgents: AgentData[] = data.results.map((agentCard: any) => mapAgentList(agentCard,channel.data.results))
          setAgents(newAgents)
        }
      } catch (err) {
        console.error("Failed to fetch agents:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

  // check if agent is present 
    let agentCardElements;
  if(agents.length>0){
    //show latest 3 agents
  const latestThree = agents
  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  .slice(0, 3);
 agentCardElements= latestThree.map((card) => (
    <AgentCard key={card.id} AgentCardDetails={card} />
  ))
  }

  return (
    <>
      <div className="h-[calc(100vh-60px)] flex flex-col">
        {/* Header */}
        <div className="w-full pt-3 pr-6 pb-3 pl-3 flex items-center justify-between border-b border-gray-200 flex-shrink-0">
          <div className="w-full">
            <div className="text-[#00001187] font-normal text-xs leading-[100%]">
              {" "}
              My Workspace
            </div>
            <div className="font-bold">
              👋 Hey {greeting}, {userName}
            </div>
          </div>
          <div className="ml-auto">
            <Button
              variant="outline"
              className="w-max flex items-center gap-1 bg-[#FDE047] rounded-2xl cursor-pointer text-black hover:bg-[#FDE047]/90"
              onClick={() => router.push("/agents/create")}
            >
              <Plus className="mr-0.5 h-4 w-4" />
              <span>Create Agent</span>
            </Button>
          </div>
        </div>

        {/* Lets get started create Agents Section */}
        <div className="w-full pt-3 pr-6 pb-3 pl-3 mt-1">
          <Card className="w-full shadow-none border-none bg-[#F0F9FF] rounded-2xl mx-auto  ">
            <CardHeader>
              <CardTitle className="text-xs font-semibold flex">
                <BsStars className="text-[#00FFFF] w-4 h-4" />
                Get Started
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3 -mt-4">
              <div className="w-[40%] ">
                <div className="font-semibold text-md">
                  Let’s Get You Started 🚀
                </div>
                <div className="text-[#00001187] font-noraml text-xs leading-[100%]">
                  Connect your accounts, upload content, and start posting
                  everywhere from one place.
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="bg-[#FDE047] rounded-2xl items-center flex gap-1 cursor-pointer"
                    onClick={() => router.push("/agents/create")}
                  >
                    <Plus className="mr-0.5 h-4 w-4" /> Create Agent
                  </Button>
                </div>
              </div>

 <div className="relative w-[40%] h-30 ml-auto bg-white rounded-md overflow-hidden">
  <Image
    src={SocialNetworkImage}
    alt="Social Network"
    fill
    style={{ objectFit: "cover"
     }}
  />
    <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-b from-transparent to-[#F0F9FF]" />

</div>
            </CardContent>
          </Card>
        </div>
        {/* Performance view section*/}
        <div className="w-full pt-3 pr-6 pb-3 pl-3">
          <div className="w-full flex justify-between">
            <div className="w-fit flex">
              <div className="w-6 h-6 gap-3 shadow-lg rounded-full border border-[#5B5B641A] p-1 hover:bg-gray-50 flex items-center justify-center">
                <FileChartColumnIncreasing />
              </div>

              <div>
                PerFormance Analytics
                <p className="text-[#00001187] font-noraml text-xs leading-[100%]">
                  Get familiar with your Content
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select>
                <SelectTrigger className="w-[180px] flex items-center justify-between border border-gray-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                  </div>

                  <SelectValue placeholder="Last 30 days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <Card className="p-3">
              <CardHeader>
                <CardTitle className="text-[#00001187] text-sm font-normal">
                  Total posts
                </CardTitle>
              </CardHeader>
              <CardContent className="font-bold text-xl -mt-6">
                {totalNoOfPosts}
              </CardContent>
            </Card>
            <Card className="p-3">
              <CardHeader>
                <CardTitle className="text-[#00001187] text-sm font-normal">
                  Engagement
                </CardTitle>
              </CardHeader>
              <CardContent className="font-bold text-xl -mt-6">
                {engagement}
              </CardContent>
            </Card>
            <Card className="p-3">
              <CardHeader>
                <CardTitle className="text-[#00001187] text-sm font-normal">
                  New Followers/ Subscribers
                </CardTitle>
              </CardHeader>
              <CardContent className="font-bold text-xl -mt-6">
                {noOfNewFollowers}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Agents Section */}
        <div>
          <div className="w-full flex justify-between pt-3 pr-6 pb-1 pl-3">
            <p className="font-normal text-sm">Recent Agent</p>
            <div className="flex w-max items-center">
              <Button
                variant="outline"
                className="rounded-lg w-max flex font-normal text-xs"
                onClick={() => router.push("/agents/list")}
              >
                View All
                <ChevronRight size={25} color="#5B5B64" className="ml-0.5" />
              </Button>
            </div>
          </div>
          {/* Recent agents */}
          {agents.length==0 ?<div className="NoAgentsPresent w-full flex justify-center items-center pr-6 pb-3 pl-3">
  <div className="w-fit flex flex-col justify-center items-center ">
    <Zap className="w-5 h-5 text-[#5B5B64]" />
    <p className="font-semibold text-sm">No Agents Created Yet</p>
    <p className="font-normal text-xs text-[#5B5B64]">Set up your first agent to automate posting, save time, and keep your content active across all platforms.</p>
  </div>
</div> :
        <div className="w-full h-fit">
          {agentCardElements}
        </div>}

        </div>
      </div>
    </>
  );
}
