// Dropzone: .dropzone wraps an input[type=file] that covers the box (a click
// opens the picker), an optional .icon and a span of text. Files dropped on the
// box are put on the input and a bubbling `change` fires from it. It never
// uploads and draws no previews: the form sends the files; read them from the
// input (URL.createObjectURL for a preview).
// Checks, on dropped and on picked files: the input's accept (".png",
// "image/png", "image/*", comma separated) and data-max-size (bytes) on the
// .dropzone. Without `multiple` only the first dropped file is taken. Rejected
// files stay off the input and a bubbling `rejected` event fires from the
// .dropzone with detail { rejected: [{ file, reason: "type" | "size" }] }. A
// drop with no accepted file leaves the input's files as they were.
// data-dragging="true" is set on the .dropzone while files are dragged over it
// (set it by hand to show the state). A disabled input takes no files.
const ZONE = ".dropzone";
const FILE = "input[type='file']";

const inputOf = (e) =>
  e.target.closest?.(ZONE)?.querySelector(`:scope > ${FILE}`);

const matches = (file, accept) => {
  const tokens = accept
    .toLowerCase()
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (!tokens.length) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((t) =>
    t.startsWith(".")
      ? name.endsWith(t)
      : t.endsWith("/*")
        ? type.startsWith(t.slice(0, -1))
        : type === t,
  );
};

// Splits files into accepted and rejected for one input.
function check(input, files) {
  const max = Number(input.closest(ZONE).dataset.maxSize) || Infinity;
  const accepted = [];
  const rejected = [];
  for (const file of files) {
    if (!matches(file, input.accept)) rejected.push({ file, reason: "type" });
    else if (file.size > max) rejected.push({ file, reason: "size" });
    else accepted.push(file);
  }
  return { accepted, rejected };
}

const setFiles = (input, files) => {
  const transfer = new DataTransfer();
  for (const file of files) transfer.items.add(file);
  input.files = transfer.files;
};

const report = (input, rejected) => {
  if (!rejected.length) return;
  input
    .closest(ZONE)
    .dispatchEvent(
      new CustomEvent("rejected", { bubbles: true, detail: { rejected } }),
    );
};

const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes("Files");

for (const type of ["dragenter", "dragover"]) {
  document.addEventListener(type, (e) => {
    const input = inputOf(e);
    if (!input || !hasFiles(e)) return;
    e.preventDefault();
    if (input.disabled) {
      e.dataTransfer.dropEffect = "none";
      return;
    }
    e.dataTransfer.dropEffect = "copy";
    input.closest(ZONE).dataset.dragging = "true";
  });
}

document.addEventListener("dragleave", (e) => {
  const zone = e.target.closest?.(ZONE);
  if (zone && !zone.contains(e.relatedTarget)) delete zone.dataset.dragging;
});

document.addEventListener("drop", (e) => {
  const input = inputOf(e);
  if (!input || !hasFiles(e)) return;
  e.preventDefault();
  delete input.closest(ZONE).dataset.dragging;
  if (input.disabled) return;
  let files = [...e.dataTransfer.files];
  if (!input.multiple) files = files.slice(0, 1);
  const { accepted, rejected } = check(input, files);
  if (accepted.length) {
    setFiles(input, accepted);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
  report(input, rejected);
});

// Picked files: filter in place before the native change reaches other
// listeners (setting input.files fires no event of its own).
document.addEventListener(
  "change",
  (e) => {
    const input = e.target.closest?.(`${ZONE} > ${FILE}`);
    if (!input?.files.length) return;
    const { accepted, rejected } = check(input, input.files);
    if (!rejected.length) return;
    setFiles(input, accepted);
    report(input, rejected);
  },
  true,
);
