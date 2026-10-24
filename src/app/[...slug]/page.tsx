import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDojoPage } from "@/lib/dojo-pages";
import { DojoPageRenderer } from "@/components/DojoPageRenderer";

export async function generateMetadata(context: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await context.params;
  const routePath = "/" + slug.join("/");
  const page = getDojoPage(routePath);
  if (!page) {
    return { title: "Not Found | LLM Dojo" };
  }
  return {
    title: page.title,
    description: page.description,
  };
}

export default async function CatchAllDojoPage(context: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await context.params;
  const routePath = "/" + slug.join("/");
  const page = getDojoPage(routePath);
  if (!page) {
    notFound();
  }
  return <DojoPageRenderer tree={page.tree} />;
}
