import { notFound } from "next/navigation";
import { getDojoPage } from "@/lib/dojo-pages";
import { DojoPageRenderer } from "@/components/DojoPageRenderer";

export default function HomePage() {
  const page = getDojoPage("/");
  if (!page) {
    notFound();
  }
  return <DojoPageRenderer tree={page.tree} />;
}
