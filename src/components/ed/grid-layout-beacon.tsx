"use client";

import { useEffect, useRef } from "react";

import { useMutate } from "@/hooks/useMutate";
import type { PhoneGridLayout } from "@/types/comparison";

// Counts one phone page view of the price grid for the A/B test — only on a phone-width screen
// (where the phone layout is what's on screen), once per page. Stores nothing on the device.
export function GridLayoutBeacon({ layout }: { layout: PhoneGridLayout }) {
  const { mutate } = useMutate("recordGridLayoutView");
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || !window.matchMedia("(max-width: 639px)").matches) return;
    sent.current = true;
    mutate(layout);
  }, [layout, mutate]);
  return null;
}
