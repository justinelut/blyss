"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  /** Aspect ratio shortcut. Use for product/image skeletons. */
  aspectRatio?: "1/1" | "4/5" | "16/9" | "3/4";
  /** Animation off — for above-the-fold skeleton slots that should not pulse */
  static?: boolean;
}

/**
 * Skeleton — Blyss-flavored surface-sunken placeholder with a subtle CSS
 * pulse. The motion-reduce variant disables animation without JavaScript.
 */
export const Skeleton = ({
  className,
  aspectRatio,
  static: isStatic,
}: SkeletonProps) => {
  const aspectClass = aspectRatio
    ? aspectRatio === "1/1"
      ? "aspect-square"
      : aspectRatio === "4/5"
        ? "aspect-[4/5]"
        : aspectRatio === "16/9"
          ? "aspect-video"
          : "aspect-[3/4]"
    : "";

  return (
    <div
      className={cn(
        "rounded-md bg-[var(--surface-sunken)]",
        !isStatic &&
          "animate-pulse [animation-duration:1.6s] motion-reduce:animate-none",
        aspectClass,
        className,
      )}
      aria-hidden="true"
    />
  );
};
