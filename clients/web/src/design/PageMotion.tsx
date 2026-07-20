"use client";

import { ReactNode } from "react";

/**
 * Layout-stable wrappers used by marketplace and dashboard surfaces. Content
 * remains visible in prerendered HTML and no client animation runtime is
 * required to render or interact with it.
 */
export const PageEnter = ({
  children,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => <div className={className}>{children}</div>;

export const StaggerList = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) => <div className={className}>{children}</div>;

export const StaggerItem = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <div className={className}>{children}</div>;

export const FadeIn = ({
  children,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => <div className={className}>{children}</div>;
