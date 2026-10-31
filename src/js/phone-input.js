// Phone input: <div class="phone-input" data-country="TH" data-name="phone">
// around an .input-group with an input[type=tel]. The script adds a country
// button (flag + dial code) in front of the input, a searchable country list
// in a popover, and a hidden input named by data-name that holds the full
// number: "+" + dial code + the digits of the field (spaces, dashes and
// brackets dropped, the leading trunk 0 dropped for countries that use one),
// or "" while the field is empty. Typing or pasting "+66 81 234 5678" picks
// the country and leaves the national part in the field. This formats and
// joins; it does not validate the number.
// Options: data-country (ISO code, default US), data-name. Events: native
// input + change on the hidden input, tsunami:phonechange on the wrapper with
// { country, dial, number, value }. API: tsunami.phoneInput.get(el) and
// .set(el, "+66812345678" | { country, number }). Country names come from
// Intl.DisplayNames, so they follow the page language. See docs/phone-input.html.
const ROOT = ".phone-input";
// Dial code then ISO code. Codes with an area code ("1242") are NANP islands;
// the longest match wins, so "+1 242 ..." is the Bahamas and "+1 415 ..." the US.
const DATA =
  "93AF 355AL 213DZ 1684AS 376AD 244AO 1264AI 1268AG 54AR 374AM 297AW 61AU 43AT 994AZ 1242BS 973BH 880BD 1246BB 375BY 32BE 501BZ 229BJ 1441BM 975BT 591BO 599CW 599BQ 387BA 267BW 55BR 246IO 1284VG 673BN 359BG 226BF 257BI 855KH 237CM 1US 1CA 238CV 1345KY 236CF 235TD 56CL 86CN 61CX 61CC 57CO 269KM 242CG 243CD 682CK 506CR 225CI 385HR 53CU 357CY 420CZ 45DK 253DJ 1767DM 1809DO 1829DO 1849DO 593EC 20EG 503SV 240GQ 291ER 372EE 268SZ 251ET 500FK 298FO 679FJ 358FI 33FR 594GF 689PF 241GA 220GM 995GE 49DE 233GH 350GI 30GR 299GL 1473GD 590GP 1671GU 502GT 44GB 44GG 224GN 245GW 592GY 509HT 504HN 852HK 36HU 354IS 91IN 62ID 98IR 964IQ 353IE 44IM 972IL 39IT 1876JM 81JP 44JE 962JO 7RU 7KZ 254KE 686KI 383XK 965KW 996KG 856LA 371LV 961LB 266LS 231LR 218LY 423LI 370LT 352LU 853MO 261MG 265MW 60MY 960MV 223ML 356MT 692MH 596MQ 222MR 230MU 262RE 262YT 52MX 691FM 373MD 377MC 976MN 382ME 1664MS 212MA 258MZ 95MM 264NA 674NR 977NP 31NL 687NC 64NZ 505NI 227NE 234NG 683NU 672NF 850KP 389MK 1670MP 47NO 968OM 92PK 680PW 970PS 507PA 675PG 595PY 51PE 63PH 48PL 351PT 1787PR 1939PR 974QA 40RO 250RW 590BL 290SH 1869KN 1758LC 590MF 508PM 1784VC 685WS 378SM 239ST 966SA 221SN 381RS 248SC 232SL 65SG 1721SX 421SK 386SI 677SB 252SO 27ZA 82KR 211SS 34ES 94LK 249SD 597SR 47SJ 46SE 41CH 963SY 886TW 992TJ 255TZ 66TH 670TL 228TG 690TK 676TO 1868TT 216TN 90TR 993TM 1649TC 688TV 1340VI 256UG 380UA 971AE 598UY 998UZ 678VU 379VA 58VE 84VN 681WF 212EH 967YE 260ZM 263ZW 358AX";
// Countries where the national number starts with a trunk 0 that is not part
// of the international number. Other countries keep the digits as typed.
const TRUNK = new Set(
  "TH VN ID MY PH IN JP KR TR ZA AU NZ FR DE AT CH NL BE GB GG JE IM IE IL EG SA AE PK BD LK KE NG".split(
    " ",
  ),
);
const S = new WeakMap();
const byCode = new Map();
const dials = new Map();
let list;
let uid = 0;

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...kids);
  return el;
}
const flag = (c) =>
  h("span", { class: `flag flag-${c.toLowerCase()}`, "aria-hidden": "true" });
const show = (c) =>
  `+${c.dial.length === 4 && c.dial[0] === "1" ? `1 ${c.dial.slice(1)}` : c.dial}`;

function countries() {
  if (list) return list;
  let names;
  try {
    names = new Intl.DisplayNames([document.documentElement.lang || "en"], {
      type: "region",
    });
  } catch {
    // An unknown language tag: the country codes stand in for the names.
  }
  for (const [, dial, code] of DATA.matchAll(/(\d+)([A-Z]{2})/g)) {
    if (!dials.has(dial)) dials.set(dial, code);
    if (!byCode.has(code))
      byCode.set(code, { code, dial, name: names?.of(code) || code });
  }
  list = [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

// Longest dial code at the start of a digit string.
function match(digits) {
  for (let n = Math.min(4, digits.length); n > 0; n--) {
    const code = dials.get(digits.slice(0, n));
    if (code) return { code, rest: digits.slice(n) };
  }
  return null;
}

const country = (root) => byCode.get(root.dataset.country) ?? byCode.get("US");

function value(root) {
  const c = country(root);
  let digits = S.get(root).input.value.replace(/\D/g, "");
  if (TRUNK.has(c.code) && digits[0] === "0") digits = digits.slice(1);
  return {
    country: c.code,
    dial: `+${c.dial}`,
    number: digits,
    value: digits ? `+${c.dial}${digits}` : "",
  };
}

// Refresh the hidden input and the button; tell the page when it changed.
function sync(root, emit) {
  const st = S.get(root);
  const v = value(root);
  const c = country(root);
  st.flag.className = `flag flag-${c.code.toLowerCase()}`;
  st.dial.textContent = show(c);
  st.btn.setAttribute("aria-label", `Country: ${c.name} ${show(c)}`);
  if (st.hidden) st.hidden.value = v.value;
  const key = `${v.country}${v.value}`;
  if (key === st.last) return;
  st.last = key;
  if (!emit) return;
  if (st.hidden) {
    st.hidden.dispatchEvent(new Event("input", { bubbles: true }));
    st.hidden.dispatchEvent(new Event("change", { bubbles: true }));
  }
  root.dispatchEvent(
    new CustomEvent("tsunami:phonechange", { bubbles: true, detail: v }),
  );
}

// "+66 81 234" in the field: switch the country, keep the national part.
// While typing it waits for a digit after the dial code.
function typed(root, final) {
  const { input } = S.get(root);
  const v = input.value.trim();
  if (v[0] !== "+") return;
  const m = match(v.replace(/\D/g, ""));
  if (!m || (!final && !m.rest)) return;
  input.value = m.rest;
  root.dataset.country = m.code;
}

// Put a full number or a national one into the field.
function setFrom(root, text, emit = false) {
  S.get(root).input.value = text;
  typed(root, true);
  sync(root, emit);
}

function build(root) {
  if (S.has(root)) return;
  const group = root.querySelector(".input-group");
  const input = group?.querySelector('input:not([type="hidden"])');
  if (!input) return;
  countries();
  const id = `phone-input-${++uid}`;
  const fl = flag("US");
  const dial = h("span");
  const btn = h(
    "button",
    {
      type: "button",
      popovertarget: `${id}-pop`,
      "aria-haspopup": "listbox",
      "aria-expanded": "false",
    },
    fl,
    dial,
  );
  const search = h("input", {
    type: "text",
    role: "combobox",
    autocomplete: "off",
    placeholder: "Search country or code",
    "aria-label": "Search countries",
    "aria-controls": `${id}-list`,
    "aria-expanded": "true",
  });
  const box = h("div", {
    role: "listbox",
    id: `${id}-list`,
    "aria-label": "Countries",
  });
  const none = h("p", { hidden: "" }, "No country found");
  const pop = h("div", { popover: "auto", id: `${id}-pop` }, search, box, none);
  const hidden = root.dataset.name
    ? h("input", { type: "hidden", name: root.dataset.name })
    : null;
  group.prepend(btn);
  if (hidden) input.after(hidden);
  root.append(pop);
  S.set(root, {
    input,
    btn,
    flag: fl,
    dial,
    search,
    box,
    none,
    pop,
    hidden,
    initial: root.dataset.country || "US",
    last: null,
  });
  if (!input.hasAttribute("autocomplete"))
    input.setAttribute("autocomplete", "tel-national");
  disable(root);
  setFrom(root, input.value);
}

function disable(root) {
  const st = S.get(root);
  st.btn.disabled = st.input.disabled;
  if (st.hidden) st.hidden.disabled = st.input.disabled;
}

// ---- country list ----
function render(root, q = "") {
  const st = S.get(root);
  const term = q.trim().toLowerCase().replace(/^\+/, "");
  const cur = country(root).code;
  const frag = document.createDocumentFragment();
  for (const c of list) {
    if (term && !`${c.name} ${c.code} ${c.dial}`.toLowerCase().includes(term))
      continue;
    const el = h(
      "div",
      {
        role: "option",
        id: `${st.box.id}-${c.code}`,
        "aria-selected": String(c.code === cur),
      },
      flag(c.code),
      h("span", {}, c.name),
      h("small", {}, show(c)),
    );
    el.code = c.code;
    frag.append(el);
  }
  st.box.replaceChildren(frag);
  st.none.hidden = st.box.children.length > 0;
  activate(
    root,
    st.box.querySelector('[aria-selected="true"]') ?? st.box.firstElementChild,
  );
}

function activate(root, el) {
  const st = S.get(root);
  st.box.querySelector("[data-active]")?.removeAttribute("data-active");
  if (!el) return st.search.removeAttribute("aria-activedescendant");
  el.setAttribute("data-active", "");
  st.search.setAttribute("aria-activedescendant", el.id);
  el.scrollIntoView({ block: "nearest" });
}

function place(root) {
  const { pop } = S.get(root);
  const r = root.querySelector(".input-group").getBoundingClientRect();
  const width = Math.min(320, innerWidth - 32);
  const above = r.bottom + 330 > innerHeight && r.top > 330;
  Object.assign(pop.style, {
    width: `${width}px`,
    left: `${Math.max(16, Math.min(r.left, innerWidth - width - 16))}px`,
    top: above ? "auto" : `${r.bottom + 4}px`,
    bottom: above ? `${innerHeight - r.top + 4}px` : "auto",
  });
}

function choose(root, code) {
  const st = S.get(root);
  st.pop.hidePopover();
  root.dataset.country = code;
  sync(root, true);
  st.input.focus();
}

const rootOf = (el) => el?.closest?.(ROOT);
const ready = (el) => {
  const root = rootOf(el);
  return root && S.has(root) ? root : null;
};
const OPTION = `${ROOT} [role="option"]`;

function toggled(e) {
  const root = e.target.matches?.(`${ROOT} > [popover]`) && ready(e.target);
  if (!root) return;
  if (e.type === "toggle")
    root
      .querySelector("button[aria-haspopup]")
      ?.setAttribute("aria-expanded", String(e.newState === "open"));
  if (e.newState !== "open") return;
  if (e.type === "beforetoggle") return place(root);
  const { search } = S.get(root);
  search.value = "";
  render(root);
  search.focus();
}
document.addEventListener("beforetoggle", toggled, true);
document.addEventListener("toggle", toggled, true);

document.addEventListener("input", (e) => {
  const root = ready(e.target);
  if (!root) return;
  const st = S.get(root);
  if (e.target === st.search) render(root, st.search.value);
  else if (e.target === st.input) {
    typed(root, false);
    sync(root, true);
  }
});

document.addEventListener("change", (e) => {
  const root = ready(e.target);
  if (root && e.target === S.get(root).input) {
    typed(root, true);
    sync(root, true);
  }
});

document.addEventListener("click", (e) => {
  const opt = e.target.closest?.(OPTION);
  const root = ready(opt);
  if (root) choose(root, opt.code);
});

document.addEventListener("mouseover", (e) => {
  const opt = e.target.closest?.(OPTION);
  const root = ready(opt);
  if (root && !opt.hasAttribute("data-active")) activate(root, opt);
});

document.addEventListener("keydown", (e) => {
  const root = ready(e.target);
  if (!root) return;
  const st = S.get(root);
  if (e.target === st.btn && e.key === "ArrowDown" && !st.btn.disabled) {
    e.preventDefault();
    st.pop.showPopover();
  }
  if (e.target !== st.search) return;
  const opts = [...st.box.children];
  const at = opts.findIndex((o) => o.hasAttribute("data-active"));
  const go = {
    ArrowDown: at + 1,
    ArrowUp: at - 1,
    Home: 0,
    End: opts.length - 1,
  }[e.key];
  if (go !== undefined) {
    e.preventDefault();
    activate(root, opts[Math.max(0, Math.min(opts.length - 1, go))]);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (opts[at]) choose(root, opts[at].code);
  }
});

// A reset puts the first country and the original text back.
document.addEventListener("reset", (e) => {
  setTimeout(() => {
    e.target.querySelectorAll(ROOT).forEach((root) => {
      const st = S.get(root);
      if (!st) return;
      root.dataset.country = st.initial;
      setFrom(root, st.input.value);
    });
  });
});

function get(el) {
  const root = rootOf(el) ?? el;
  return S.has(root) ? value(root) : null;
}

// set(el, "+66812345678") or set(el, { country: "TH", number: "0812345678" })
function set(el, v) {
  const root = rootOf(el) ?? el;
  if (!S.has(root)) return;
  if (typeof v === "string") return setFrom(root, v, true);
  if (v.country && byCode.has(String(v.country).toUpperCase()))
    root.dataset.country = String(v.country).toUpperCase();
  setFrom(root, String(v.number ?? ""), true);
}

const buildAll = (r = document) => r.querySelectorAll(ROOT).forEach(build);
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => buildAll());
else buildAll();

new MutationObserver((records) => {
  for (const r of records) {
    if (r.type === "attributes") {
      const root = ready(r.target);
      if (root && r.target === S.get(root).input) disable(root);
      continue;
    }
    for (const n of r.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.matches(ROOT)) build(n);
      else buildAll(n);
    }
  }
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["disabled"],
});

(window.tsunami ??= {}).phoneInput = { get, set };
