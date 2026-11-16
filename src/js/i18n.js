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
    "datePicker.label": "Choose a date",
    "datePicker.labelRange": "Choose dates",
    "datePicker.to": " to ",
    "datePicker.application": "Calendar",
    "datePicker.navigation": "Calendar Navigation",
    "datePicker.arrowPrev.month": "Previous month",
    "datePicker.arrowNext.month": "Next month",
    "datePicker.arrowPrev.year": "Previous list of years",
    "datePicker.arrowNext.year": "Next list of years",
    "datePicker.arrowPrev.week": "Previous week",
    "datePicker.arrowNext.week": "Next week",
    "datePicker.month": "Select month, current selected month:",
    "datePicker.months": "List of months",
    "datePicker.year": "Select year, current selected year:",
    "datePicker.years": "List of years",
    "datePicker.week": "Days of the week",
    "datePicker.dates": "Dates in the current month",
  },
  th: {
    "pagination.prev": "หน้าก่อนหน้า",
    "pagination.next": "หน้าถัดไป",
    "table.range": "{from}–{to} จาก {total}",
    "table.rangeEmpty": "0 จาก {total}",
    "table.empty": "ไม่พบผลลัพธ์",
    "datePicker.label": "เลือกวันที่",
    "datePicker.labelRange": "เลือกช่วงวันที่",
    "datePicker.to": " ถึง ",
    "datePicker.application": "ปฏิทิน",
    "datePicker.navigation": "แถบนำทางปฏิทิน",
    "datePicker.arrowPrev.month": "เดือนก่อนหน้า",
    "datePicker.arrowNext.month": "เดือนถัดไป",
    "datePicker.arrowPrev.year": "ช่วงปีก่อนหน้า",
    "datePicker.arrowNext.year": "ช่วงปีถัดไป",
    "datePicker.arrowPrev.week": "สัปดาห์ก่อนหน้า",
    "datePicker.arrowNext.week": "สัปดาห์ถัดไป",
    "datePicker.month": "เลือกเดือน เดือนที่เลือกอยู่:",
    "datePicker.months": "รายการเดือน",
    "datePicker.year": "เลือกปี ปีที่เลือกอยู่:",
    "datePicker.years": "รายการปี",
    "datePicker.week": "วันในสัปดาห์",
    "datePicker.dates": "วันที่ในเดือนนี้",
  },
};

export const langOf = (el) =>
  (el?.closest?.("[lang]")?.lang || document.documentElement.lang || "en").toLowerCase();

// Fills {name} placeholders from vars; an unknown name stays as it is.
export const fill = (text, vars = {}) =>
  text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

// The message for key in a language (a tag such as "th-TH"), placeholders filled.
export function say(language, key, vars) {
  const lang = String(language).toLowerCase();
  const text =
    catalogs[lang]?.[key] ?? catalogs[lang.split("-")[0]]?.[key] ?? catalogs.en[key] ?? key;
  return fill(text, vars);
}

// The message for key in the language of el.
export const t = (el, key, vars) => say(langOf(el), key, vars);

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
