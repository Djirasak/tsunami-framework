export { siteMetadata as metadata, siteViewport as viewport } from "../_lib/seo";
import Root from "../_components/root";

// The landing page at "/": no docs chrome, its own stylesheet.
export default function Layout({ children }) {
  return (
    <Root docs={false} styles={["/landing.css"]}>
      {children}
    </Root>
  );
}
