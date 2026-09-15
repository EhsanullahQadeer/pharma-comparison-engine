"use client";

import NextLink, { type LinkProps } from "next/link";
import { type ComponentProps } from "react";

import { start } from "@/lib/route-progress";

export default function Link({
  onClick,
  ...props
}: ComponentProps<"a"> & LinkProps) {
  return (
    <NextLink
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target === "_blank" ||
          props.download
        )
          return;
        const destination = new URL(event.currentTarget.href);
        if (
          destination.origin === window.location.origin &&
          (destination.pathname !== window.location.pathname ||
            destination.search !== window.location.search)
        )
          start();
      }}
    />
  );
}
