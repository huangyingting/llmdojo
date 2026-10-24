import type { Metadata } from "next";
import { InviteRedeemCard } from "@/components/InviteRedeemCard";

export const metadata: Metadata = {
  title: "Redeem Invitation | LLM Dojo",
  description:
    "Redeem an invitation code to register your LLM Dojo account.",
};

export default async function RegisterPage(context: {
  searchParams: Promise<{ token?: string; invite?: string }>;
}) {
  const sp = await context.searchParams;
  const initialToken = sp.token ?? sp.invite ?? "";
  return <InviteRedeemCard initialToken={initialToken} />;
}
