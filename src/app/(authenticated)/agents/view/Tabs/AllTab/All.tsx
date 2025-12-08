// src/app/(authenticated)/agents/view/Tabs/All.tsx

"use client";
import React, { Dispatch } from "react";
import api from "@/lib/axios";
import { useEffect, useState } from "react";
import { AgentData, Settings } from "../../../list/types";
import { AccountType, PostType, Channel_Posts } from "../../../create/types";
import { AGENT_URLS, CHANNEL_URL } from "@/lib/urls"; // Import AGENT_URLS for patching schedule
import CarouselAll from "./CarouselAll";
import AllPostFromComp from "./AllPostFromComp";
import { CarouselPostDetails } from "../../../create/types";

// Props for the All component
type Props = {
  AgentData: AgentData;
  selectedPosts: PostType[];
  selectedCPosts: CarouselPostDetails[];
  setSelectedPosts: React.Dispatch<React.SetStateAction<PostType[]>>;
  setSelectedCPosts: React.Dispatch<
    React.SetStateAction<CarouselPostDetails[]>
  >;
  refreshKey: number;
};

export default function All(props: Props) {
  // const [carouselPosts, setCarouselPosts] = useState<CarouselPostDetails[]>([]);
  // const [posts, setPosts] = useState<PostType[]>([]);
  // console.log("carouselPosts",carouselPosts);

  return (
    <>
      {props.AgentData.type == "create_carousel_or_slider" ? (
        <CarouselAll
          key={props.refreshKey}
          AgentData={props.AgentData}
          selectedCPosts={props.selectedCPosts}
          setSelectedCPosts={props.setSelectedCPosts}
        />
      ) : (
        <AllPostFromComp
          refreshKey={props.refreshKey}
          AgentData={props.AgentData}
          selectedPosts={props.selectedPosts}
          setSelectedPosts={props.setSelectedPosts}
        />
      )}
    </>
  );
}
