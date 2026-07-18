import { HTMLMotionProps, motion } from "motion/react";

export type FadeUpProps = HTMLMotionProps<"div">;

const fadeUpVariants = {
  // Core onboarding content must be readable in prerendered HTML. Parent
  // motion may still coordinate timing, but never hides the child.
  hidden: { opacity: 1, y: 0 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35 },
  },
};

export const FadeUp = ({
  variants = fadeUpVariants,
  ...props
}: Omit<HTMLMotionProps<"div">, "children" | "variants"> & FadeUpProps) => {
  return <motion.div variants={variants} {...props} />;
};
