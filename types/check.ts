// Compiled by `bun run check:types`: proves the declarations parse and merge.
window.tsunami.theme.get();
document.addEventListener("tsunami:toastclose", (e) => e.detail.reason);
window.tsunami.messages.set("fr", { "pagination.prev": "Page précédente" });
window.tsunami.messages.get("th")["table.empty"];
