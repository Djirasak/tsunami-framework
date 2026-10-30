export { siteMetadata as metadata, siteViewport as viewport } from "../_lib/seo";
import Root from "../_components/root";

export default function Layout({ children }) {
  return <Root>{children}</Root>;
}
