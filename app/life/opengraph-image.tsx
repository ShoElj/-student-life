import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "Student Life: live a Nigerian school life with your friends";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({
    title: "Student Life",
    tagline: "Live a Nigerian school life with your friends.",
    chips: ["Go to class", "Earn Naira", "Play football", "Eat jollof", "Buy a home", "Climb the leaderboard"],
  });
}
