import { Metadata } from "next";
import LandingPage from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "Business Orbit - The Professional Networking Platform for Growth",
  description: "Join exclusive chapters, attend events, and build meaningful professional relationships. Business Orbit is where founders and leaders connect.",
  alternates: {
    canonical: 'https://businessorbit.org',
  },
};

export default function HomePage() {
  return <LandingPage />;
}
