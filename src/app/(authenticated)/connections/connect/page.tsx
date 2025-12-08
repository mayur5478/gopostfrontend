"use client";
import api from "@/lib/axios";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { channel } from "diagnostics_channel";

function ConnectionContent() {
  const searchParams = useSearchParams();
  const [isConnectionSuccessful, setIsConnectionSuccessful] = useState<
    boolean | null
  >(null);
  const router = useRouter();
  const channel = searchParams.get("channel_type");
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      console.log("Didn't recieve the code");
      setIsConnectionSuccessful(false);
      return;
    } // no code in URL, do nothing

    console.log("Authorization Code:", code);
    console.log("Raw state:", state);

    let channel = null;
    try {
      if (state) {
        const decodedState = JSON.parse(decodeURIComponent(state));
        channel = decodedState.channel_type;
      }
    } catch (err) {
      console.error("Failed to parse state:", err);
    }

    if (!channel) {
      console.error("Channel type missing in OAuth state.");
      return;
    }
    const fetchData = async () => {
      try {
        console.log("after getting code");
        const response = await api.post("channels/connect/", {
          channel_type: channel,
          code: code, // use code directly
          redirect_uri: `${window.location.origin}/connections/connect`,
        });
        console.log("connect response:", response);
        if (response.status === 200) {
          setIsConnectionSuccessful(true);
        } else {
          console.log("failed to connect", response);
          setIsConnectionSuccessful(false);
        }
      } catch (error) {
        setIsConnectionSuccessful(false);
      }
    };


    fetchData();
  }, [searchParams]);

  return (
    <div className=" flex flex-col w-full h-full items-center justify-center">
      {isConnectionSuccessful === null && (
        <h1 className="text-gray-400">Connecting your {channel} account...</h1>
      )}

      {isConnectionSuccessful === true && (
        <h1 className="text-green-500">
          Your {channel}
          account has been connected to Go Post
        </h1>
      )}

      {isConnectionSuccessful === false && (
        <h1 className="text-red-500">
          Oops! Something went wrong. We couldn't connect your {channel}{" "}
          account.
        </h1>
      )}
      <Button
        variant="outline"
        className="bg-[#FDE047] rounded-2xl flex items-center gap-2"
        onClick={() => {
          router.push(`/connections`);
        }}
      >
        Go to Connections
      </Button>
    </div>
  );
}

export default function connection() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full h-full items-center justify-center">
          <h1 className="text-gray-400">Loading...</h1>
        </div>
      }
    >
      <ConnectionContent />
    </Suspense>
  );
}
