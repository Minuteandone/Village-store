(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const EDITION_KEY = "agent04-museum-editions-v10";
  const LINEAGE_KEY = "agent04-museum-edition-lineage-v15";

  let selectedKey = null;
  let lastSignature = "";

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function shelfCodes() {
    const raw = readJson(EDITION_KEY, null);
    const codes = new Set();
    if (!raw || !Array.isArray(raw.editions)) return codes;

    raw.editions.slice(-4).forEach(item => {
      if (item && typeof item === "object" && typeof item.code === "string") {
        codes.add(item.code);
      }
    });
    return codes;
  }

  function relations() {
    const raw = readJson(LINEAGE_KEY, null);
    if (!raw || !Array.isArray(raw.relations)) return [];
    return raw.relations.filter(item =>
      item &&
      typeof item === "object" &&
      typeof item.parentCode === "string" &&
      typeof item.childCode === "string" &&
      item.parentCode !== item.childCode &&
      typeof item.lens === "string" &&
      typeof item.createdAt === "string"
    ).slice(-6);
  }

  function fossils() {
    const shelf = shelfCodes();
    const result = [];

    relations().forEach(relation => {
      if (!shelf.has(relation.parentCode)) {
        result.push({
          key: relation.parentCode + ">" + relation.childCode + ":parent",
          missingCode: relation.parentCode,
          survivingCode: relation.childCode,
          role: "parent",
          lens: relation.lens,
          createdAt: relation.createdAt,
          relation
        });
      }
      if (!shelf.has(relation.childCode)) {
        result.push({
          key: relation.parentCode + ">" + relation.childCode + ":child",
          missingCode: relation.childCode,
          survivingCode: relation.parentCode,
          role: "child",
          lens: relation.lens,
          createdAt: relation.createdAt,
          relation
        });
      }
    });

    return result.slice(-12);
  }

  function selectedFossil() {
    const items = fossils();
    if (!items.length) return null;
    return items.find(item => item.key === selectedKey) || items[items.length - 1];
  }

  function currentRoom() {
    const main = readJson(STORAGE_KEY, {});
    return typeof main.room === "string" ? main.room : "vestibule";
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function ensurePanel() {
    let section = document.getElementById("fossilPanelV17");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "fossilPanelV17";
    section.className = "visit-card fossil-panel-v17";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "FOSSIL CITATIONS · v1.7";

    const status = document.createElement("p");
    status.id = "fossilStatusV17";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "openFossilsV17";
    button.className = "full-button";
    button.type = "button";
    button.textContent = "inspect fossil citations";
    button.addEventListener("click", openDialog);

    section.append(eyebrow, status, button);

    const inheritance = aside.querySelector("#inheritancePanelV16");
    const distant = aside.querySelector(".distant-wings");
    if (inheritance?.nextSibling) aside.insertBefore(section, inheritance.nextSibling);
    else if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("fossilDialogV17");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "fossilDialogV17";
    dialog.className = "dialog fossil-dialog-v17";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "▱";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "WHAT SURVIVED THE SHELF · v1.7";

    const title = document.createElement("h2");
    title.id = "fossilTitleV17";
    title.textContent = "Fossil Citations";

    const body = document.createElement("p");
    body.id = "fossilBodyV17";

    const chooser = document.createElement("div");
    chooser.id = "fossilChooserV17";
    chooser.className = "fossil-chooser-v17";

    const card = document.createElement("section");
    card.id = "fossilCardV17";
    card.className = "fossil-card-detail-v17";

    const warning = document.createElement("p");
    warning.className = "control-hint";
    warning.textContent = "A fossil citation preserves only the code-level lineage that v1.5 actually retained. Missing compact summaries are not reconstructed.";

    const close = document.createElement("button");
    close.type = "button";
    close.className = "quiet-button";
    close.textContent = "close fossil drawer";
    close.addEventListener("click", () => dialog.close());

    dialog.append(mark, eyebrow, title, body, chooser, card, warning, close);
    document.body.append(dialog);
    return dialog;
  }

  function renderChooser(items, selected) {
    const node = document.getElementById("fossilChooserV17");
    if (!node) return;
    node.replaceChildren();

    items.slice().reverse().forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fossil-choice-v17";
      button.setAttribute("aria-pressed", String(selected?.key === item.key));
      button.addEventListener("click", () => {
        selectedKey = item.key;
        refreshDialog();
      });

      const code = document.createElement("strong");
      code.textContent = item.missingCode;

      const meta = document.createElement("span");
      meta.textContent = "missing " + item.role + " summary · " + item.lens;

      button.append(code, meta);
      node.append(button);
    });
  }

  function renderCard(item) {
    const node = document.getElementById("fossilCardV17");
    if (!node) return;
    node.replaceChildren();
    if (!item) return;

    const stamp = document.createElement("div");
    stamp.className = "fossil-stamp-v17";
    stamp.textContent = "SUMMARY NOT RETAINED";

    const code = document.createElement("strong");
    code.className = "fossil-code-v17";
    code.textContent = item.missingCode;

    const relation = document.createElement("p");
    relation.textContent = item.role === "parent"
      ? "This code is the recorded parent of " + item.survivingCode + "."
      : "This code is the recorded child of " + item.survivingCode + ".";

    const lens = document.createElement("p");
    lens.textContent = "Recorded editorial lens: " + item.lens + ".";

    const date = document.createElement("p");
    date.textContent = "Lineage timestamp: " + item.createdAt + ".";

    const boundary = document.createElement("p");
    boundary.className = "fossil-boundary-v17";
    boundary.textContent =
      "The lineage store did not retain this edition's compact summary. Its detailed contents are therefore unavailable from the Museum's retained data.";

    node.append(stamp, code, relation, lens, date, boundary);
  }

  function refreshDialog() {
    ensureDialog();
    const items = fossils();
    const selected = selectedFossil();
    const title = document.getElementById("fossilTitleV17");
    const body = document.getElementById("fossilBodyV17");

    if (!items.length) {
      setText(title, "No Fossils Yet");
      setText(body, "Every explicit lineage relation still has both edition codes represented on the current Living Catalog shelf.");
    } else {
      setText(title, "Fossil Citation · " + selected.missingCode);
      setText(
        body,
        items.length + " lost shelf summary" + (items.length === 1 ? "" : "ies") +
        " still survive as code-level lineage citations."
      );
    }

    renderChooser(items, selected);
    renderCard(selected);
  }

  function openDialog() {
    const dialog = ensureDialog();
    refreshDialog();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function refreshPanel() {
    ensurePanel();
    const items = fossils();
    const status = document.getElementById("fossilStatusV17");
    const button = document.getElementById("openFossilsV17");

    if (!items.length) {
      setText(status, "No aged-off lineage summaries yet.");
    } else {
      setText(
        status,
        items.length + " fossil citation" + (items.length === 1 ? "" : "s") +
        " · code-level lineage survives where compact summaries do not"
      );
    }
    if (button) button.disabled = !items.length;
  }

  function renderArchiveFossil() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;

    const existing = layer.querySelector(".fossil-object-v17");
    const items = fossils();

    if (currentRoom() !== "archive" || !items.length) {
      if (existing) existing.remove();
      return;
    }

    let node = existing;
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "fossil-object-v17";
      node.style.left = "65%";
      node.style.top = "20%";
      node.addEventListener("click", openDialog);

      const mark = document.createElement("span");
      mark.className = "fossil-object-mark-v17";
      mark.textContent = "▱";

      const label = document.createElement("span");
      label.className = "fossil-object-label-v17";

      node.append(mark, label);
      layer.append(node);
    }

    setText(node.querySelector(".fossil-object-label-v17"), "FOSSILS ×" + items.length);
    node.setAttribute(
      "aria-label",
      items.length + " fossil citation" + (items.length === 1 ? "" : "s") +
      " for lineage editions whose compact summaries are no longer retained."
    );
  }

  function signature() {
    const shelf = [...shelfCodes()].sort().join(",");
    const lineage = relations().map(item => item.parentCode + ">" + item.childCode).join(",");
    return shelf + "|" + lineage + "|" + currentRoom();
  }

  function refreshAll() {
    refreshPanel();
    renderArchiveFossil();
    if (document.getElementById("fossilDialogV17")?.open) refreshDialog();
    lastSignature = signature();
  }

  setInterval(() => {
    const next = signature();
    if (next !== lastSignature) refreshAll();
    else renderArchiveFossil();
  }, 440);

  ensurePanel();
  ensureDialog();
  refreshAll();
})();