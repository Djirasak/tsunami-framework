import Root from "../_components/root";

export default function Layout({ children }) {
  return <Root docs={false}>{children}</Root>;
}
