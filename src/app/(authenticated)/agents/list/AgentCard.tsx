"use client";

import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import classNames from "classnames";
import { AgentData } from "./types";
import { Input } from "@/components/ui/input";
import api from "@/lib/axios";
import { AGENT_URLS } from "@/lib/urls";
import toast from "react-hot-toast";

type props = {
  AgentCardDetails: AgentData;
};

export default function AgentCard(props: props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(props.AgentCardDetails.name);
  const [isLoading, setIsLoading] = useState(false);

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
              "first-letter:uppercase w-fit h-fit px-2 py-0.5 font-medium rounded-md text-[11px] flex items-center justify-center leading-none border-0",
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
      </div>

      <div className="buttons flex items-center gap-3">
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
                className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50 border-gray-200"
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 border-gray-200"
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
      </div>
    </div>
  );
}