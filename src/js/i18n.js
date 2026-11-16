// Messages: the words the scripts write into the page, in each language.
// The language of an element is the lang of its nearest [lang] ancestor, else
// <html lang>, else English. A region falls back to its language (th-TH to th),
// and a key a language lacks falls back to English.
// window.tsunami.messages.set("fr", { "pagination.prev": "Page précédente" })
// adds or changes words; get("fr") returns the words for a language.
// Placeholders such as {from} are filled in by the script that uses the message.
const catalogs = {
  en: {
    "pagination.prev": "Previous page",
    "pagination.next": "Next page",
    "table.range": "{from}–{to} of {total}",
    "table.rangeEmpty": "0 of {total}",
    "table.empty": "No results",
  },
  th: {
    "pagination.prev": "หน้าก่อนหน้า",
    "pagination.next": "หน้าถัดไป",
    "table.range": "{from}–{to} จาก {total}",
    "table.rangeEmpty": "0 จาก {total}",
    "table.empty": "ไม่พบผลลัพธ์",
  },
};

const langOf = (el) =>
  (el?.closest?.("[lang]")?.lang || document.documentElement.lang || "en").toLowerCase();

// Fills {name} placeholders from vars; an unknown name stays as it is.
export const fill = (text, vars = {}) =>
  text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

// The message for key in the language of el, with its placeholders filled.
export function t(el, key, vars) {
  const lang = langOf(el);
  const text =
    catalogs[lang]?.[key] ?? catalogs[lang.split("-")[0]]?.[key] ?? catalogs.en[key] ?? key;
  return fill(text, vars);
}

(window.tsunami ??= {}).messages = {
  get(lang) {
    const key = String(lang).toLowerCase();
    return { ...catalogs.en, ...catalogs[key.split("-")[0]], ...catalogs[key] };
  },
  set(lang, words) {
    const key = String(lang).toLowerCase();
    catalogs[key] = { ...catalogs[key], ...words };
  },
};
