"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FaWandMagicSparkles } from "react-icons/fa6";
import { Loader2, Copy } from "lucide-react";
import AddHashtagModal from "../AddHashTagModal";
import api from "@/lib/axios";
import { MEDIA_ENGINE_URLS } from "@/lib/urls"; 
import toast, { Toaster } from "react-hot-toast";
import { PostType } from "../../agents/create/types";
import { Label } from "@/components/ui/label";
import { FaPencilAlt } from "react-icons/fa";

type MetaDataProps = {
  post: PostType;
  metadataTitle: Record<string, string>;
  setMetadataTitle: Dispatch<SetStateAction<Record<string, string>>>;
  metadataDesc: Record<string, string>;
  setMetadataDesc: Dispatch<SetStateAction<Record<string, string>>>;
  hashtags: Record<string, string[]>;
  setHashtags: Dispatch<SetStateAction<Record<string, string[]>>>;
  metadataContent: { title: string, description: string, tags: string[] };
  setMetadataContent: Dispatch<SetStateAction<{ title: string, description: string, tags: string[] }>>;
  prompts: Record<string, string>;
  setPrompts: Dispatch<SetStateAction<Record<string, string>>>;
};

export default function Metadata(props: MetaDataProps) {
  const [isMetaGenerated, setIsMetaGenerated] = useState(false);
  const [openHashtagModal, setOpenHashtagModal] = useState(false);
  const [activeTab, setActiveTab] = useState("content");
  const [isLoading, setIsLoading] = useState(false);
  
  const platforms = [
    { id: 0, channel: "Content" },
    ...props.post.posts.map((post) => ({
      id: post.platform.id,
      channel: post.platform.channel_type,
    })),
  ];

  const handlePromptChange = (key: string, value: string) => {
    props.setPrompts((prev) => ({ ...prev, [key]: value }));
  };

  // --- SWITCH VIEW IF DATA EXISTS ---
  useEffect(() => {
    if (props.metadataContent.title || props.metadataContent.description) {
      setIsMetaGenerated(true);
    }
  }, [props.metadataContent]);

  const hasDataForTab = (key: string) => !!(props.metadataTitle[key] || props.metadataDesc[key]);

  const handleGenerateWithAI = async (currentTabKey: string) => {
    const contentPrompt = props.prompts[currentTabKey]?.trim();
    if (!contentPrompt) { toast.error("Please write a prompt!"); return; }
    setIsLoading(true);
    try {
        const response = await api.post(MEDIA_ENGINE_URLS.HASHTAGS, { prompt: contentPrompt, n: 12 });
        const data = response.data;
        
        const isMasterTab = currentTabKey.toLowerCase() === "content";
        const targets = isMasterTab ? platforms.map(p => p.channel.toLowerCase()) : [currentTabKey]; 

        if (data.title) {
            props.setMetadataTitle((prev) => { const u = { ...prev }; targets.forEach((t) => u[t] = data.title); return u; });
            if(isMasterTab) props.setMetadataContent(prev => ({...prev, title: data.title}));
        }
        if (data.description) {
            props.setMetadataDesc((prev) => { const u = { ...prev }; targets.forEach((t) => u[t] = data.description); return u; });
            if(isMasterTab) props.setMetadataContent(prev => ({...prev, description: data.description}));
        }
        if (data.hashtags) {
            props.setHashtags((prev) => { const u = { ...prev }; targets.forEach((t) => u[t] = data.hashtags); return u; });
            if(isMasterTab) props.setMetadataContent(prev => ({...prev, tags: data.hashtags}));
        }

        toast.success("Generated!");
        setIsMetaGenerated(true);
    } catch(e) { toast.error("Failed"); } finally { setIsLoading(false); }
  };

  const handleSaveHashtags = (p: string, s: string[]) => { 
      const safe = Array.isArray(s) ? s : [];
      props.setHashtags(prev => {
        const updated = { ...prev };
        if (p === "content") {
          updated["content"] = safe;
          platforms.forEach((plat: any) => {
             const key = plat.channel.toLowerCase();
             if(key !== "content") updated[key] = safe;
          });
        } else {
          updated[p] = safe;
        }
        return updated;
      });
  };

  return (
    <div className="w-full flex justify-between gap-6">
      <div className="w-full h-full border border-gray-200 rounded-md p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex border-b w-fit justify-start bg-transparent p-0 h-fit gap-3 ml-[1rem]">
            {platforms.map((platform) => (
              <TabsTrigger key={platform.id} value={platform.channel.toLowerCase()} className="pb-3 px-2 rounded-none border-b-2 border-transparent text-[#5B5B64] data-[state=active]:border-b-black data-[state=active]:text-black capitalize">
                {platform.channel}
              </TabsTrigger>
            ))}
          </TabsList>

          {platforms.map((platform) => {
            const key = platform.channel.toLowerCase();
            const showResults = isMetaGenerated || hasDataForTab(key);

            return (
              <TabsContent key={platform.id} value={key}>
                <div className="w-full max-w-md mt-3">
                  {!showResults ? (
                    <div className="flex flex-col border rounded-2xl overflow-hidden">
                      <Textarea placeholder={`Write a prompt for ${platform.channel}...`} className="resize-none border-none h-40 p-3" value={props.prompts[key] || ""} onChange={(e) => handlePromptChange(key, e.target.value)} />
                      <div className="flex justify-end gap-2 bg-gray-50 p-2">
                        <Button size="sm" className="bg-gradient-to-r from-[#22D3EE] to-[#FFD600] text-white rounded-2xl" onClick={() => handleGenerateWithAI(key)} disabled={isLoading}>
                          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FaWandMagicSparkles className="w-4 h-4 text-white" />} {isLoading ? "Generating..." : "Generate with AI"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between"><Label>Title</Label><Button size="icon" variant="ghost" onClick={() => {navigator.clipboard.writeText(props.metadataTitle[key] || ""); toast.success("Copied!")}}><Copy className="w-4 h-4"/></Button></div>
                        <Input value={props.metadataTitle[key] || ""} onChange={(e) => props.setMetadataTitle((prev) => ({...prev, [key]: e.target.value}))} />
                      </div>
                      <div>
                         <div className="flex items-center justify-between"><Label>Description</Label><Button size="icon" variant="ghost" onClick={() => {navigator.clipboard.writeText(props.metadataDesc[key] || ""); toast.success("Copied!")}}><Copy className="w-4 h-4"/></Button></div>
                         <Textarea value={props.metadataDesc[key] || ""} onChange={(e) => props.setMetadataDesc((prev) => ({...prev, [key]: e.target.value}))} className="h-40" />
                      </div>
                      <div className="flex justify-between gap-2 bg-gray-50 p-2 rounded-lg">
                        <Button size="sm" className="bg-gradient-to-r from-[#22D3EE] to-[#FFD600] text-white rounded-2xl" onClick={() => { props.setMetadataTitle(prev => ({...prev, [key]: ""})); props.setMetadataDesc(prev => ({...prev, [key]: ""})); setIsMetaGenerated(false); }}>
                            <FaPencilAlt className="w-4 h-4 mr-2" /> Write Prompt
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-2xl bg-[#00000114]" onClick={() => setOpenHashtagModal(true)}>
                          # Add Hashtag
                        </Button>
                        <AddHashtagModal
                          open={openHashtagModal}
                          onClose={() => setOpenHashtagModal(false)}
                          trendingHashtags={props.hashtags[key] || []}
                          addedHashTags={Array.isArray(props.hashtags[key]) ? props.hashtags[key] : []}
                          onSave={(selected) => handleSaveHashtags(key, selected)}
                          prompt={props.prompts[key] || ""}
                          title={props.metadataTitle[key]}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}