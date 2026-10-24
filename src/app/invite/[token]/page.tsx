import type { Metadata } from "next";
import { InviteRedeemCard } from "@/components/InviteRedeemCard";

export const metadata: Metadata = {
  title: "Accept Invitation | LLM Dojo",
  description:
    "Accept your LLM Dojo invitation and create your account.",
};

export default async function InviteTokenPage(context: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await context.params;
  return <InviteRedeemCard initialToken={decodeURIComponent(token)} />;
}
