import Shell from "../../../_components/Shell";
import { plainSlugs } from "../../../_lib/content";
import { pageMetadata } from "../../../_lib/seo";

export const dynamicParams = false;

export const generateStaticParams = () =>
  plainSlugs.map((slug) => ({ slug }));

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return pageMetadata(slug);
}

export default async function Page({ params }) {
  const { slug } = await params;
  return <Shell slug={slug} />;
}
