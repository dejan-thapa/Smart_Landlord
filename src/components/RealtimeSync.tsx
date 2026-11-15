"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * RealtimeSync — mounted globally in layout.tsx.
 * Subscribes to ALL postgres_changes on the public schema.
 * When any row is inserted, updated, or deleted in any tracked table,
 * calls router.refresh() to re-fetch Server Component data seamlessly.
 */
export default function RealtimeSync() {
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel("db-global-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Renders nothing — purely a side-effect component
  return null;
}
