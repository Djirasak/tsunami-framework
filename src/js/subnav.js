// Subnav: several .subnav menus can sit side by side before the content, all
// but one hidden. A link with aria-controls does the swapping:
// - a link (in a sidebar, say) that controls a .subnav shows that menu, hides
//   the other subnavs in the same parent, and opens the menu's current section
//   (the link with aria-current="page", or else its first link);
// - a link in a .subnav that controls another element shows it and hides the
//   other elements controlled from a subnav in the same parent.
// In both cases aria-current moves to the clicked link within its .sidebar or
// .subnav. Links without aria-controls are plain links.
const SUBNAV = ".subnav";

const controlled = (el) =>
  el.id && document.querySelector(`${SUBNAV} [aria-controls="${CSS.escape(el.id)}"]`);

function mark(link) {
  const group = link.closest(`.sidebar, ${SUBNAV}`);
  if (!group) return;
  for (const a of group.querySelectorAll('a[aria-current="page"]'))
    a.removeAttribute("aria-current");
  link.setAttribute("aria-current", "page");
}

function open(link) {
  const target = document.getElementById(link.getAttribute("aria-controls"));
  if (!target) return;
  if (target.matches(SUBNAV)) {
    for (const el of target.parentElement.children)
      if (el.matches(SUBNAV)) el.hidden = el !== target;
    const first =
      target.querySelector('a[aria-current="page"][aria-controls]') ??
      target.querySelector("a[aria-controls]");
    if (first) open(first);
  } else if (link.closest(SUBNAV)) {
    for (const el of target.parentElement.children)
      if (el === target || controlled(el)) el.hidden = el !== target;
  } else return;
  mark(link);
}

document.addEventListener("click", (e) => {
  const link = e.target.closest?.("a[aria-controls]");
  if (!link || e.defaultPrevented) return;
  const target = document.getElementById(link.getAttribute("aria-controls"));
  if (!target || !(target.matches(SUBNAV) || link.closest(SUBNAV))) return;
  e.preventDefault();
  open(link);
});
