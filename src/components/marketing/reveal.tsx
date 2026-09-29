"use client";

import { useEffect, useRef, useState } from "react";

import type { ReactNode } from "react";

// Fades/slides its children in the first time they scroll into view. The hidden starting state lives
// in globals.css behind `prefers-reduced-motion: no-preference` and `scripting: enabled`, so
// reduced-motion users and no-JS visitors always see the content immediately.
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setShown(true);
      observer.disconnect();
    }, { rootMargin: "0px 0px -8% 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-reveal={shown ? "shown" : "pending"} className={className} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
