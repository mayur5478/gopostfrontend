"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo, Dispatch, SetStateAction } from "react";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { MEDIA_ENGINE_URLS } from "@/lib/urls";

interface AddHashtagModalProps {
  open: boolean;
  onClose: () => void;
  trendingHashtags: string[];
  onSave?: (selectedHashtags: string[]) => void;
  addedHashTags: string[];
  prompt: string;
  // setPrompt: Dispatch<SetStateAction<string>>;
  title: string;
}

export default function AddHashtagModal({
  open,
  onClose,
  trendingHashtags,
  onSave,
  addedHashTags,
  prompt,
  title,
}: AddHashtagModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [extraTags, setExtraTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Base tags (trending OR added)
  const baseTags = useMemo(() => {
    return trendingHashtags?.length ? trendingHashtags : addedHashTags;
  }, [trendingHashtags, addedHashTags]);

  // Combined final hashtag list
  const combinedHashtags = useMemo(() => {
    return Array.from(new Set([...baseTags, ...extraTags]));
  }, [baseTags, extraTags]);

  // Apply search filter
  const filteredTags = useMemo(() => {
    if (!search.trim()) return combinedHashtags;
    return combinedHashtags.filter((tag) =>
      tag.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, combinedHashtags]);

  // Selected at top
  const sortedTags = useMemo(() => {
    const set = new Set(selected);
    return [
      ...filteredTags.filter((t) => set.has(t)),
      ...filteredTags.filter((t) => !set.has(t)),
    ];
  }, [filteredTags, selected]);

  // Sync on open
  useEffect(() => {
    if (open) setSelected(addedHashTags);
  }, [open, addedHashTags]);

  const toggleSelect = (tag: string) => {
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = () => {
    onSave?.(selected);
    handleClose();
  };

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  const loadMoreHashtags = async () => {
    let contentPrompt = prompt.trim() || title;
    if (!contentPrompt) {
      toast.error("Please write a prompt before generating!");
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post(MEDIA_ENGINE_URLS.HASHTAGS, {
        prompt: contentPrompt,
        n: 6,
      });
      const tags = res.data?.hashtags || [];
      setExtraTags((prev) => Array.from(new Set([...prev, ...tags])));
      toast.success("More hashtags loaded!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load hashtags");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[400px] max-w-full p-6 rounded-xl bg-white">
        <DialogHeader>
          <DialogTitle>Add Hashtag</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Search hashtags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="my-4"
        />

        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {sortedTags.length ? (
            sortedTags.map((tag) => (
              <div
                key={tag}
                className="flex justify-between items-center font-semibold p-2 rounded-md"
              >
                <span>{tag}</span>
                <Button
                  size="sm"
                  variant={selected.includes(tag) ? "default" : "outline"}
                  className={`rounded-2xl ${selected.includes(tag)
                      ? "bg-black text-white"
                      : "bg-[#00000014] text-black"
                    }`}
                  onClick={() => toggleSelect(tag)}
                >
                  {selected.includes(tag) ? "Added" : "Add"}
                </Button>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground">
              No hashtags to display
            </p>
          )}
        </div>



        <DialogFooter className="mt-4 flex w-full p-0 !px-0 justify-between">
          <Button
            onClick={loadMoreHashtags}
            disabled={isLoading}
            className="rounded-md hover:bg-black/90"
          >
            {isLoading ? "Loading..." : "Load More..."}
          </Button>
          <Button className=""
            disabled={isLoading}
            onClick={handleSave}>
            Save Hashtags
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
