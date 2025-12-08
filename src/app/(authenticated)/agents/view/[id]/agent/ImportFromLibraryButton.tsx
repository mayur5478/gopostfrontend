"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import LibraryImportModal, {
  MediaItem,
} from "../../../create/components/LibraryImportModal";
import {
  AccountType,
  PostType,
} from "@/app/(authenticated)/agents/create/types";

interface ImportFromLibraryButtonProps {
  selectedAccounts: AccountType[];
  onImport: (newPosts: PostType[]) => void;
  isCarousel?: boolean;
  className?: string;
  text?: string;
}

export default function ImportFromLibraryButton({
  selectedAccounts,
  onImport,
  isCarousel = false,
  className = "",
  text = "Choose from Library",
}: ImportFromLibraryButtonProps) {
  const [open, setOpen] = useState(false);

const handleImport = (selected: MediaItem[]) => {
  const mappedPosts: PostType[] = selected.map((item) => ({
    mainId: `lib-${item.id}-${Math.random().toString(36).slice(2)}`,
    agent: "library-import",
    mediaUrl: item.file_url,
    fileKey: item.file_key || "",
    size: item.file_size || 0,
    posts: selectedAccounts.map((account) => ({
      postId: `lib-${item.id}-${account.id}`,
      title: item.file_name || "Library File",
      status: "uploaded",
      uploadProgress: 100,
      platform: account,
      source: "library",
      content: {},
      caption: [],
      tags: [],
      thumbnailUrl: item.file_url,
      resize: "square",
      metadata: { description: "", mediaType: item.file_type },
      date: new Date(item.created_at || Date.now()).toISOString(),
    })),
  }));

  console.log("MAPPED POSTS BEFORE RETURN", mappedPosts);  // <<< CHECK THIS
  onImport(mappedPosts);
  setOpen(false);
};


  return (
    <>
      <Button
        variant="outline"
        className={`bg-white border-[#E5E5E5] text-black rounded-xl ${className}`}
        onClick={() => setOpen(true)}
      >
        {text}
      </Button>

      <LibraryImportModal
        open={open}
        onOpenChange={setOpen}
        onImport={handleImport}
        isCarousel={isCarousel}
      />
    </>
  );
}
