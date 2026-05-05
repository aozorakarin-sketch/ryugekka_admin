import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatJST = (s: string) => {
  if (!s) return "-"
  const utc = s.endsWith('Z') ? s : s + 'Z'
  const d = new Date(utc)
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return `${jst.getUTCFullYear()}/${jst.getUTCMonth() + 1}/${jst.getUTCDate()} ${jst.getUTCHours().toString().padStart(2, "0")}:${jst.getUTCMinutes().toString().padStart(2, "0")}:${jst.getUTCSeconds().toString().padStart(2, "0")}`
}
