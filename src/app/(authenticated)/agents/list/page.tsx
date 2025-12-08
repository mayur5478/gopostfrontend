"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Search, Plus, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AgentCard from "./AgentCard";
import api from "@/lib/axios";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AGENT_URLS } from "@/lib/urls";
import { AgentData } from "./types";
import mapAgentList from "./mapAgentList";

const PAGE_SIZE = 10;

export default function ListAgent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentData[]>([]);

  // --- Filter & Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAgents, setTotalAgents] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectType, setSelectType] = useState("All");
  const [selectStatus, setSelectStatus] = useState("All");
  const [selectSort, setSelectSort] = useState("Recent");

  // Helper to map display names to API values
  const getApiTypeValue = (displayType: string) => {
    switch (displayType) {
      case "Post From Computer": return "post_from_computer";
      case "Cross-Post Across Socials": return "cross_post";
      case "Create Carousel or Slider": return "create_carousel_or_slider";
      default: return ""; // "All" returns empty string
    }
  };

  const getApiStatusValue = (displayStatus: string) => {
    if (displayStatus === "All") return "";
    return displayStatus.toLowerCase();
  };

  // --- Fetch Agents Function ---
  const fetchAgents = useCallback(async (page: number) => {
    setLoading(true);
    try {
      // 1. Construct parameters
      const params: any = {
        page: page,
        page_size: PAGE_SIZE,
      };

      // 2. Add Search
      if (searchTerm) params.search = searchTerm;
      
      // 3. Add Filters
      const typeVal = getApiTypeValue(selectType);
      if (typeVal) params.type = typeVal;

      const statusVal = getApiStatusValue(selectStatus);
      if (statusVal) params.status = statusVal;

      // 4. Add Sorting
      if (selectSort === "Recent") params.ordering = "-created_at";
      if (selectSort === "Oldest") params.ordering = "created_at";
      if (selectSort === "Name A-Z") params.ordering = "name";
      if (selectSort === "Name Z-A") params.ordering = "-name";

      console.log("Fetching agents with params:", params);

      // 5. Call API
      const response = await api.get(AGENT_URLS.GET_AGENTS, { params });
      const data = response.data;

      if (data && data.results) {
        const newAgents: AgentData[] = data.results.map((agentCard: any) => mapAgentList(agentCard));
        setAgents(newAgents);
        setTotalAgents(data.count || 0);
        setTotalPages(Math.ceil((data.count || 0) / PAGE_SIZE));
        setCurrentPage(page);
      } else {
        setAgents([]);
        setTotalAgents(0);
        setTotalPages(0);
      }
    } catch (err) {
      console.error("Failed to fetch agents:", err);
      setAgents([]);
      setTotalAgents(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [selectType, selectStatus, selectSort, searchTerm]); // Re-create function if these change

  // --- Effects ---

  // 1. Debounce Search: Wait 500ms after user stops typing to fetch
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAgents(1); // Reset to page 1 on search
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // 2. Immediate fetch when Filters change
  useEffect(() => {
    fetchAgents(1);
  }, [selectType, selectStatus, selectSort]);


  // --- Pagination Handlers ---
  const handleNextPage = () => {
    if (currentPage < totalPages) fetchAgents(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) fetchAgents(currentPage - 1);
  };

  const agentCardElements = agents.map((card) => (
    <AgentCard key={card.id} AgentCardDetails={card} />
  ));

  return (
    <div className="listAgent flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#E5E5E5] px-6 py-4 flex-shrink-0">
        <div className="flex flex-col gap-1">
          <div className="font-semibold text-xl text-[#181818]">Agents ({totalAgents})</div>
          <div className="text-sm text-[#5B5B64]">
            Manage and monitor your automated posting agents.
          </div>
        </div>
        <div>
          <Button
            variant="default"
            className="bg-[#FDE047] hover:bg-[#FDE047]/90 text-black rounded-xl gap-2 font-medium"
            onClick={() => router.push('/agents/create')}
          >
            <Plus className="h-4 w-4" /> Create Agent
          </Button>
        </div>
      </div>

      {/* Filters and List */}
      <div className="p-6 flex-grow overflow-y-auto">
        {/* Search and Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center">
          <div className="relative w-full md:w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              type="search" 
              placeholder="Search agents..." 
              className="pl-9 rounded-xl border-gray-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3 flex-wrap w-full md:w-auto justify-end">
            {/* Type Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl border-gray-200 text-[#5B5B64] font-normal gap-2">
                  Type: <span className="text-[#181818] font-medium">{selectType}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[240px]">
                <DropdownMenuItem onClick={() => setSelectType("All")}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectType("Post From Computer")}>Post From Computer</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectType("Cross-Post Across Socials")}>Cross-Post Across Socials</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectType("Create Carousel or Slider")}>Create Carousel or Slider</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Status Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl border-gray-200 text-[#5B5B64] font-normal gap-2">
                  Status: <span className="text-[#181818] font-medium">{selectStatus}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectStatus("All")}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectStatus("Live")}>Live</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectStatus("Paused")}>Paused</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectStatus("Draft")}>Draft</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectStatus("Deleted")}>Deleted</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl border-gray-200 text-[#5B5B64] font-normal gap-2">
                  Sort By: <span className="text-[#181818] font-medium">{selectSort}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                 <DropdownMenuItem onClick={() => setSelectSort("Recent")}>Recent</DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setSelectSort("Oldest")}>Oldest</DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setSelectSort("Name A-Z")}>Name A-Z</DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setSelectSort("Name Z-A")}>Name Z-A</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="w-full h-64 flex items-center justify-center text-gray-500">
            Loading agents...
          </div>
        ) : agents.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center mt-20 text-center">
            <div className="bg-gray-50 p-4 rounded-full mb-3">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No agents found</h3>
            <p className="text-gray-500 mt-1 max-w-sm">
              We couldn't find any agents matching your filters. Try adjusting your search or filters.
            </p>
            <Button 
                variant="link" 
                className="mt-2 text-[#FDE047] hover:text-[#FCD34D]"
                onClick={() => {
                    setSearchTerm("");
                    setSelectType("All");
                    setSelectStatus("All");
                }}
            >
                Clear all filters
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-6">
            {agentCardElements}
          </div>
        )}
      </div>

       {/* Pagination */}
       {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 p-4 border-t border-gray-200 bg-white">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="rounded-lg"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-gray-600 font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="rounded-lg"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}