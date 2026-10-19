(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const REFERENCE_KEY = "agent04-museum-resonance-v04";
  const AFTERIMAGE_KEY = "agent04-museum-afterimages-v05";
  const CURATOR_KEY = "agent04-museum-curator-v06";
  const UNBUILT_KEY = "agent04-museum-unbuilt-v08";
  const EDITION_KEY = "agent04-museum-editions-v10";

  const driftRooms = {
    almosts: "conservatory",
    visitedRooms: "vestibule",
    changes: "workshop",
    echoes: "observatory",
    afterimages: "archive",
    referenceMounted: "vestibule",
    importedLineage: "vestibule",
    curatedRevisions: "workshop",
    curatedExhibits: "workshop",
    blueprints: "archive"
  };

  const reviewedRooms = new Set();
  let trackedEditionCode = null;
  let lastSignature = "";

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function boundedCount(value, max = 999999) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? Math.max(0, Math.min(max, Math.floor(number))) : 0;
  }

  function currentSummary() {
    const main = readJson(STORAGE_KEY, {});
    const reference = readJson(REFERENCE_KEY, null);
    const afterimages = readJson(AFTERIMAGE_KEY, null);
    const curator = readJson(CURATOR_KEY, null);
    const unbuilt = readJson(UNBUILT_KEY, null);
    const fragments = Array.isArray(main.fragments) ? main.fragments : [];
    const visited = Array.isArray(main.visited) ? main.visited : [];
    const echoes = Array.isArray(main.echoes) ? main.echoes : [];
    const interventions = curator && Array.isArray(curator.interventions)
      ? curator.interventions.filter(item => item && typeof item.exhibitId === "string")
      : [];
    const curatedExhibits = new Set(interventions.map(item => item.exhibitId));
    const foreign = main.foreignCatalog && typeof main.foreignCatalog === "object" ? main.foreignCatalog : null;

    return {
      almosts: boundedCount(new Set(fragments).size, 32),
      visitedRooms: boundedCount(new Set(visited).size, 32),
      changes: boundedCount(main.changes),
      echoes: boundedCount(new Set(echoes).size, 32),
      afterimages: boundedCount(Array.isArray(afterimages?.snapshots) ? afterimages.snapshots.length : 0, 16),
      referenceMounted: Boolean(reference && reference.states && typeof reference.states === "object"),
      importedLineage: Boolean(foreign),
      curatedRevisions: boundedCount(interventions.length, 64),
      curatedExhibits: boundedCount(curatedExhibits.size, 32),
      blueprints: boundedCount(Array.isArray(unbuilt?.blueprints) ? unbuilt.blueprints.length : 0, 16)
    };
  }

  function latestEdition() {
    const raw = readJson(EDITION_KEY, null);
    if (!raw || !Array.isArray(raw.editions)) return null;
    const items = raw.editions.filter(item =>
      item &&
      typeof item === "object" &&
      typeof item.code === "string" &&
      ["possibility", "provenance", "architecture"].includes(item.lens) &&
      item.summary &&
      typeof item.summary === "object"
    ).slice(-4);
    return items[items.length - 1] || null;
  }

  function activeRooms(edition) {
    if (!edition) return [];
    const now = currentSummary();
    const rooms = Object.entries(driftRooms)
      .filter(([key]) => edition.summary[key] !== now[key])
      .map(([, room]) => room);
    return [...new Set(rooms)];
  }

  function currentRoom() {
    const main = readJson(STORAGE_KEY, {});
    return typeof main.room === "string" ? main.room : "vestibule";
  }

  function state() {
    const edition = latestEdition();
    if (edition?.code !== trackedEditionCode) {
      reviewedRooms.clear();
      trackedEditionCode = edition?.code || null;
      clearPreparedNotice();
    }

    const active = activeRooms(edition);
    [...reviewedRooms].forEach(room => {
      if (!active.includes(room)) reviewedRooms.delete(room);
    });

    const reviewed = active.filter(room => reviewedRooms.has(room));
    const pending = active.filter(room => !reviewedRooms.has(room));

    return {
      edition,
      active,
      reviewed,
      pending,
      outdated: Boolean(edition && active.length),
      ready: Boolean(edition && active.length && pending.length === 0)
    };
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function ensurePanel() {
    let section = document.getElementById("reissuePanelV14");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "reissuePanelV14";
    section.className = "visit-card reissue-panel-v14";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "SECOND EDITION · v1.4";

    const status = document.createElement("p");
    status.id = "reissueStatusV14";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "prepareReissueV14";
    button.className = "full-button";
    button.type = "button";
    button.textContent = "prepare reissue";
    button.addEventListener("click", prepareReissue);

    section.append(eyebrow, status, button);

    const crossref = aside.querySelector("#crossrefPanelV13");
    const distant = aside.querySelector(".distant-wings");
    if (crossref?.nextSibling) aside.insertBefore(section, crossref.nextSibling);
    else if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("reissueDialogV14");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "reissueDialogV14";
    dialog.className = "dialog reissue-dialog-v14";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "Ⅱ";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "PUBLICATION LOOP · v1.4";

    const title = document.createElement("h2");
    title.textContent = "Prepare a Second Edition";

    const body = document.createElement("p");
    body.id = "reissueBodyV14";

    const progress = document.createElement("div");
    progress.id = "reissueProgressV14";
    progress.className = "reissue-progress-v14";

    const actions = document.createElement("div");
    actions.className = "reissue-actions-v14";

    const prepare = document.createElement("button");
    prepare.id = "prepareReissueDialogV14";
    prepare.className = "full-button";
    prepare.type = "button";
    prepare.textContent = "prepare Living Catalog reissue";
    prepare.addEventListener("click", prepareReissue);

    const close = document.createElement("button");
    close.className = "quiet-button";
    close.type = "button";
    close.textContent = "close second edition";
    close.addEventListener("click", () => dialog.close());

    actions.append(prepare, close);
    dialog.append(mark, eyebrow, title, body, progress, actions);
    document.body.append(dialog);
    return dialog;
  }

  function renderProgress(current) {
    const node = document.getElementById("reissueProgressV14");
    if (!node) return;
    node.replaceChildren();

    if (!current.edition || !current.active.length) {
      const empty = document.createElement("div");
      empty.className = "reissue-empty-v14";
      empty.textContent = current.edition
        ? "The latest edition is current. There is nothing to reissue."
        : "Print a Living Catalog edition first.";
      node.append(empty);
      return;
    }

    current.active.forEach(room => {
      const row = document.createElement("div");
      row.className = "reissue-room-v14";
      row.dataset.reviewed = reviewedRooms.has(room) ? "true" : "false";

      const mark = document.createElement("span");
      mark.textContent = reviewedRooms.has(room) ? "✓" : "·";

      const name = document.createElement("strong");
      name.textContent = room;

      const status = document.createElement("span");
      status.textContent = reviewedRooms.has(room) ? "footnote reviewed" : "review required";

      row.append(mark, name, status);
      node.append(row);
    });
  }

  function refreshDialog() {
    ensureDialog();
    const current = state();
    const body = document.getElementById("reissueBodyV14");
    const prepare = document.getElementById("prepareReissueDialogV14");

    if (!current.edition) {
      setText(body, "A second edition needs a first edition.");
    } else if (!current.outdated) {
      setText(body, current.edition.code + " still matches the Museum. Reissuing it would add no new summarized state.");
    } else if (!current.ready) {
      setText(
        body,
        "Review all " + current.active.length + " current Walking Footnote room" + (current.active.length === 1 ? "" : "s") +
        " before preparing a reissue under the same " + current.edition.lens + " lens."
      );
    } else {
      setText(
        body,
        "All current footnote rooms have been reviewed in this page session. The Living Catalog can now be prepared under the same " +
        current.edition.lens + " lens as " + current.edition.code + ". Printing remains your explicit choice."
      );
    }

    if (prepare) prepare.disabled = !current.ready;
    renderProgress(current);
  }

  function openDialog() {
    const dialog = ensureDialog();
    refreshDialog();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function clearPreparedNotice() {
    document.getElementById("reissueNoticeV14")?.remove();
    document.getElementById("printEditionV10")?.classList.remove("reissue-print-v14");
  }

  function attachPreparedNotice(edition) {
    const dialog = document.getElementById("editionDialogV10");
    const print = document.getElementById("printEditionV10");
    if (!dialog || !print) return;

    clearPreparedNotice();

    const notice = document.createElement("p");
    notice.id = "reissueNoticeV14";
    notice.className = "reissue-notice-v14";
    notice.textContent =
      "Second Edition prepared from " + edition.code +
      " after reviewing all current footnote rooms. The " + edition.lens +
      " lens is selected. Press Print only if you want to create a new local edition.";
    const preview = document.getElementById("editionPreviewV10");
    if (preview) preview.insertAdjacentElement("beforebegin", notice);
    else dialog.append(notice);

    print.classList.add("reissue-print-v14");
    print.focus({ preventScroll: true });
  }

  function prepareReissue() {
    const current = state();
    if (!current.ready || !current.edition) return;

    document.getElementById("reissueDialogV14")?.close();

    const open = document.getElementById("openEditionV10");
    if (!open) return;
    open.click();

    setTimeout(() => {
      const lens = document.querySelector('.edition-lens-v10[data-lens="' + current.edition.lens + '"]');
      if (lens) lens.click();
      attachPreparedNotice(current.edition);
    }, 0);
  }

  function renderArchiveCard() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;
    const existing = layer.querySelector(".reissue-card-v14");
    const current = state();

    if (currentRoom() !== "archive" || !current.ready) {
      if (existing) existing.remove();
      return;
    }

    let card = existing;
    if (!card) {
      card = document.createElement("button");
      card.type = "button";
      card.className = "reissue-card-v14";
      card.style.left = "75%";
      card.style.top = "34%";
      card.addEventListener("click", openDialog);

      const mark = document.createElement("span");
      mark.className = "reissue-mark-v14";
      mark.textContent = "Ⅱ";

      const label = document.createElement("span");
      label.className = "reissue-label-v14";
      label.textContent = "SECOND EDITION";

      card.append(mark, label);
      layer.append(card);
    }

    card.setAttribute(
      "aria-label",
      "Second Edition ready for " + current.edition.code + ". Click to prepare a Living Catalog reissue."
    );
  }

  function refreshPanel() {
    ensurePanel();
    const current = state();
    const status = document.getElementById("reissueStatusV14");
    const button = document.getElementById("prepareReissueV14");

    if (!current.edition) {
      setText(status, "No Living Catalog edition yet.");
    } else if (!current.outdated) {
      setText(status, "Latest edition is current · no second edition needed.");
    } else if (!current.ready) {
      setText(
        status,
        current.reviewed.length + "/" + current.active.length +
        " footnote room" + (current.active.length === 1 ? "" : "s") + " reviewed"
      );
    } else {
      setText(status, "Footnote review complete · second edition can be prepared under the " + current.edition.lens + " lens.");
    }

    if (button) button.disabled = !current.ready;
  }

  function signature() {
    const current = state();
    return [
      current.edition?.code || "-",
      current.active.slice().sort().join(","),
      current.reviewed.slice().sort().join(","),
      currentRoom()
    ].join("|");
  }

  function refreshAll() {
    refreshPanel();
    renderArchiveCard();
    if (document.getElementById("reissueDialogV14")?.open) refreshDialog();
    lastSignature = signature();
  }

  document.addEventListener("click", event => {
    const marker = event.target?.closest?.(".walking-footnote-v12");
    if (!marker) return;
    const current = state();
    const room = currentRoom();
    if (!current.active.includes(room)) return;
    reviewedRooms.add(room);
    setTimeout(refreshAll, 0);
  }, true);

  setInterval(() => {
    const next = signature();
    if (next !== lastSignature) refreshAll();
    else renderArchiveCard();
  }, 380);

  ensurePanel();
  ensureDialog();
  refreshAll();
})();