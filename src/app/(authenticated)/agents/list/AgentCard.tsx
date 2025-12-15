"use client";

import { Button } from "@/components/ui/button";
import React, { ReactNode, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Pencil, Check, X, Loader2, SoupIcon } from 'lucide-react';
import { useRouter } from "next/navigation";
import classNames from "classnames";
import { AgentData } from "./types";
import { Input } from "@/components/ui/input";
import api from "@/lib/axios";
import { AGENT_URLS, CHANNEL_URL } from "@/lib/urls";
import toast from "react-hot-toast";
import { RiComputerLine } from "react-icons/ri";
import { FaMobileAlt } from "react-icons/fa";
import { BiSolidChevronsRight } from "react-icons/bi";
import { MonitorSmartphone } from 'lucide-react';
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaPlayCircle,
  FaGoogleDrive,
} from "react-icons/fa";
import { AccountType } from "../create/types";
import { channel } from "diagnostics_channel";
import { IconType } from "react-icons";

type props = {
  AgentCardDetails: AgentData;
};
type PlatformCircleProps = {
  icon: ReactNode;
  bg?: string;
};
export default function AgentCard(props: props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(props.AgentCardDetails.name);
  const [isLoading, setIsLoading] = useState(false);
  const [sourcePlatform, setSourcePlatfrom] = useState(props.AgentCardDetails.source);
  const [destPlatforms, setDestPlatfroms] = useState<string[]>();
  const [sourceIcon, setSourceIcon] = useState<React.JSX.Element>(<div></div>);
  const [destIcons, setDestIcons] = useState<React.JSX.Element[]>([]);
  let goToViewAgent = () => {
    router.push(`/agents/view/${props.AgentCardDetails.id}/agent`);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Agent name cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      await api.patch(AGENT_URLS.VIEW_AGENT(props.AgentCardDetails.id), {
        name: name
      });
      toast.success("Agent name updated!");
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update name", error);
      toast.error("Failed to update name");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setName(props.AgentCardDetails.name);
    setIsEditing(false);
  };

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
  useEffect(() => {
    if (sourcePlatform === "local") {
      setSourceIcon(<SourceLocal />);
    } else {
      //(sourcePlatform === "google" ||sourcePlatform === "linkedin"||sourcePlatform === "youtube"){
      const { Icon, color } = getIconAndColor(sourcePlatform)
      if (!Icon) return;
      setSourceIcon(
        <div
          className={`w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 shadow-sm `}
        >
          <Icon className={`w-5 h-5 ${color} `} />
        </div>
      );
    }
    console.log("agent", props.AgentCardDetails)
    //for destination icon get all channels first then check the account type ids from agent connections 
    // Save the channel types for your other state
    // setDestPlatfroms(props.AgentCardDetails.destinationPlatforms.map((ch) => ch.channel_type));
    const icons = props.AgentCardDetails.destinationPlatforms.map((ch) => {
      const { Icon, color } = getIconAndColor(ch.channel_type);
      return Icon ? (
        <Icon key={ch.id} className={`w-5 h-5 ${color} `} />
      ) : null
    }
    )
    // Convert to icons
    setDestIcons(
      icons.filter((i): i is React.ReactElement => i !== null)
    )
  }, [sourcePlatform]);

  return (
    <div className="card mt-3 border border-[#00000114] bg-white rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
      <div className="agentDetails flex flex-col gap-2 flex-1 mr-4">
        <div className="flex items-center gap-3">
          {isEditing ? (
            <div className="flex items-center gap-2 max-w-[300px]">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-[18px] font-semibold border-gray-300 focus:ring-[#FDE047] focus:border-[#FDE047]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
              />
            </div>
          ) : (
            <div className="agentName font-semibold text-[18px] text-[#181818] truncate">
              {name}
            </div>
          )}

          <Badge
            variant="outline"
            className={classNames(
              "first-letter:uppercase w-fit h-fit px-2 py-0.5 font-medium rounded-md text-[11px] flex items-center justify-center leading-none border-0 capitalize",
              props.AgentCardDetails.status.toLowerCase() == "live" && "text-[#008236] bg-[#F0FDF4]",
              props.AgentCardDetails.status.toLowerCase() == "draft" && "text-[#A66000] bg-[#FEFCE8]",
              props.AgentCardDetails.status.toLowerCase() == "paused" && "text-[#E7000B] bg-[#FEF2F2]",
              props.AgentCardDetails.status.toLowerCase() == "deleted" && "text-gray-600 bg-gray-100"
            )}
          >
            {props.AgentCardDetails.status}
          </Badge>
        </div>
        <div>
          <Badge
            variant="secondary"
            className="px-2 py-1 text-[12px] rounded-md w-fit h-fit text-[#5B5B64] bg-[#F5F5F5] font-normal"
          >
            {props.AgentCardDetails.type.replace(/_/g, " ")}
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

      </div>

      {/* <div className="buttons flex flex-col items-center gap-3">
        <Button
          variant="default"
          className="bg-[#FDE047] hover:bg-[#FDE047]/90 text-black rounded-xl px-5 font-medium"
          onClick={goToViewAgent}
        >
          View in Detail
        </Button>

        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-full text-green-600 hover:text-green-700 hover:bg-green-50 border-gray-200"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-gray-200"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="flex items-center gap-2 text-sm font-medium rounded-xl border-[#E5E5E5] hover:bg-gray-50"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-4 w-4 text-[#5B5B64]" />
            Edit
          </Button>
        )}
      </div> */}
      <div className="buttons flex flex-col items-center gap-3 w-[20%]">
        <Button
          variant="default"
          className="w-full bg-[#FDE047] hover:bg-[#FDE047]/90 text-black rounded-xl px-5 font-medium"
          onClick={goToViewAgent}
        >
          View in Detail
        </Button>

        {isEditing ? (
          <div className="flex flex-col items-center w-full gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-full text-green-600 hover:text-green-700 hover:bg-green-50 border-gray-200"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-gray-200"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 text-sm font-medium rounded-xl border-[#E5E5E5] hover:bg-gray-50"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-4 w-4 text-[#5B5B64]" />
            Edit
          </Button>
        )}
      </div>

    </div>
  );
}