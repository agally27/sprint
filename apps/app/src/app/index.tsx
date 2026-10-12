import { Redirect } from "expo-router";
import { useStore } from "@/store/store";

export default function Index() {
  const onboarded = useStore((s) => s.state.onboarded);
  const active = useStore((s) => s.state.activeSessionId);
  if (!onboarded) return <Redirect href="/onboarding" />;
  if (active) return <Redirect href="/focus" />;
  return <Redirect href="/home" />;
}
