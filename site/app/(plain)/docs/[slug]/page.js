import Shell from "../../../_components/Shell";
import { pages, plainSlugs } from "../../../_lib/content";

export const dynamicParams = false;

export const generateStaticParams = () =>
  plainSlugs.map((slug) => ({ slug }));

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return { title: `${pages[slug].title} | Tsunami` };
}

export default async function Page({ params }) {
  const { slug } = await params;
  return <Shell slug={slug} />;
}
