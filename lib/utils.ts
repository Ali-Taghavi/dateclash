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

/**
 * Convert Celsius to Fahrenheit
 * @param celsius Temperature in Celsius
 * @returns Temperature in Fahrenheit, rounded to nearest integer
 */
export function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

/**
 * Format temperature with unit
 * @param celsius Temperature in Celsius
 * @param unit 'c' for Celsius, 'f' for Fahrenheit
 * @returns Formatted string with unit symbol
 */
export function formatTemperature(celsius: number, unit: 'c' | 'f'): string {
  const temp = unit === 'f' ? celsiusToFahrenheit(celsius) : Math.round(celsius);
  const symbol = unit === 'f' ? '°F' : '°C';
  return `${temp}${symbol}`;
}
