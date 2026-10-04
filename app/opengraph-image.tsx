import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "School Breaktime Battle and Student Life: free school games to play with friends";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({
    title: "School Breaktime Battle",
    tagline: "Free school games to play with your friends.",
    chips: ["Race to the canteen", "Dodge prefects", "Live a student life"],
  });
}
