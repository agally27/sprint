import { useRouter } from "expo-router";
import { Fallback } from "@/components/Fallback";

export default function NotFound() {
  const router = useRouter();
  return (
    <Fallback title="That page isn't here." body="Nothing is lost. Your missions and sprints are exactly where you left them." actionLabel="Go to today" onAction={() => router.replace("/home")} />
  );
}
