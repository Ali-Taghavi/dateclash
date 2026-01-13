import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes with clsx and tailwind-merge.
 * This is the standard pattern used in shadcn/ui components.
 *
 * @param inputs - Class names or conditional class objects
 * @returns Merged class string
 *
 * @example
 * cn("px-2 py-1", { "bg-red-500": isActive }, "text-white")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
