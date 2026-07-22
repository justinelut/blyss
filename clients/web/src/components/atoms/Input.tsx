import { Input as ShadInput } from "@/components/ui/input";
import { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

export type InputProps = ComponentProps<typeof ShadInput> & {
  preSlot?: React.ReactNode;
  postSlot?: React.ReactNode;
};

const Input = ({ ref, preSlot, postSlot, className, ...props }: InputProps) => {
  return (
    <div className="relative flex flex-1 flex-row rounded-full">
      <ShadInput
        className={twMerge(
          "h-10 rounded-md border-0 border-b border-b-transparent bg-[var(--surface-sunken)] px-3 py-2 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] transition-colors focus:z-10 focus:border-b-[var(--border-strong)] focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          preSlot ? "pl-10" : "",
          postSlot ? "pr-10" : "",
          className,
        )}
        ref={ref}
        {...props}
      />
      {preSlot && (
        <div className="dark:text-polar-400 pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-gray-500">
          {preSlot}
        </div>
      )}
      {postSlot && (
        <div className="dark:text-polar-400 pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center pr-4 text-gray-500">
          {postSlot}
        </div>
      )}
    </div>
  );
};

Input.displayName = "Input";

export default Input;
