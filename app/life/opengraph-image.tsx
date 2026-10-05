import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "Student Life: live a Nigerian university life with your friends";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({
    title: "Student Life",
    tagline: "Live a Nigerian university life with your friends.",
    chips: ["100L to 400L", "Graduate", "Get a job", "Earn Naira", "Play football", "Buy a home"],
  });
}
