import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Custom font-size utilities (defined in globals.css) must be registered so
// tailwind-merge treats them as font-size — otherwise it groups them with
// text-color classes (both start with `text-`) and drops the color, leaving
// black text. See `.text-panel-*` in globals.css.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": ["text-panel-sm", "text-panel-md", "text-panel-lg"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
