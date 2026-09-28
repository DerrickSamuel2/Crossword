const DIRECTIONS = ["across", "down"];

/**
 * Escapes a string for use in a CSS attribute selector.
 *
 * @param {string} value - Attribute value to escape.
 * @returns {string} Safely escaped selector value.
 */
function escapeSelectorValue(value) {
  return window.CSS?.escape ? window.CSS.escape(value) : value.replace(/["\\]/g, "\\$&");
}

/**
 * Creates a crossword DOM renderer bound to the page shell mount points.
 *
 * @param {object} mounts - Page elements used to render the puzzle.
 * @param {HTMLElement} mounts.grid - Grid mount point.
 * @param {HTMLElement} mounts.acrossClues - Across clue list mount point.
 * @param {HTMLElement} mounts.downClues - Down clue list mount point.
 * @param {HTMLElement} mounts.status - Live status element.
 * @returns {object} Renderer API for rendering and scoped visual updates.
 */
export function createCrosswordRenderer({ grid, acrossClues, downClues, status }) {
  if (
    !(grid instanceof HTMLElement) ||
    !(acrossClues instanceof HTMLElement) ||
    !(downClues instanceof HTMLElement) ||
    !(status instanceof HTMLElement)
  ) {
    throw new Error("Crossword renderer requires grid, clue, and status mount elements.");
  }

  /**
   * Renders the complete crossword grid from validated cell coordinates.
   *
   * @param {object} model - Validated puzzle model.
   * @returns {void}
   */
  function renderGrid(model) {
    const table = document.createElement("table");
    table.className = "crossword-table";
    table.setAttribute("role", "grid");
    table.setAttribute("aria-label", "Crossword letter grid");

    const body = document.createElement("tbody");

    for (let y = 1; y <= model.height; y += 1) {
      const row = document.createElement("tr");

      for (let x = 1; x <= model.width; x += 1) {
        const key = `${x},${y}`;
        const cell = model.cells.get(key);
        const tableCell = document.createElement("td");

        if (!cell) {
          tableCell.className = "crossword-block";
          tableCell.setAttribute("aria-hidden", "true");
          row.append(tableCell);
          continue;
        }

        tableCell.className = "crossword-cell";
        tableCell.dataset.cell = key;
        tableCell.dataset.entryIds = cell.entryIds.join(" ");
        tableCell.setAttribute("role", "gridcell");

        if (cell.number !== null) {
          const number = document.createElement("span");
          number.className = "cell-number";
          number.setAttribute("aria-hidden", "true");
          number.textContent = String(cell.number);
          tableCell.append(number);
        }

        const input = document.createElement("input");
        input.className = "crossword-input";
        input.type = "text";
        input.inputMode = "text";
        input.maxLength = 1;
        input.autocomplete = "off";
        input.spellcheck = false;
        input.dataset.cell = key;
        input.dataset.entryIds = cell.entryIds.join(" ");
        input.setAttribute("aria-label", `Row ${y}, column ${x}`);
        input.setAttribute("tabindex", "-1");
        tableCell.append(input);
        row.append(tableCell);
      }

      body.append(row);
    }

    table.append(body);
    grid.replaceChildren(table);
  }

  /**
   * Renders an ordered directional clue list.
   *
   * @param {HTMLElement} list - Ordered list mount point.
   * @param {Array<object>} entries - Entries in directional display order.
   * @param {string} direction - Entry direction.
   * @returns {void}
   */
  function renderClueList(list, entries, direction) {
    const clueItems = entries.map((entry) => {
      const item = document.createElement("li");
      const button = document.createElement("button");

      button.type = "button";
      button.className = "clue-button";
      button.dataset.entryId = entry.id;
      button.dataset.direction = direction;
      button.textContent = `${entry.position}. ${entry.clue}`;

      item.append(button);
      return item;
    });

    list.replaceChildren(...clueItems);
  }

  /**
   * Renders a validated model into the application shell.
   *
   * @param {object} model - Validated puzzle model.
   * @returns {void}
   */
  function render(model) {
    renderGrid(model);
    renderClueList(acrossClues, model.acrossEntries, "across");
    renderClueList(downClues, model.downEntries, "down");
    status.textContent = "Select a clue to begin.";
    grid.dataset.width = String(model.width);
    grid.dataset.height = String(model.height);
  }

  /**
   * Updates only the input and cell matching a shared puzzle coordinate.
   *
   * @param {string} cellKey - Stable coordinate key.
   * @param {string} value - Letter value to display.
   * @returns {void}
   */
  function updateCellValue(cellKey, value) {
    const selectorValue = escapeSelectorValue(cellKey);
    const input = grid.querySelector(`.crossword-input[data-cell="${selectorValue}"]`);
    const cell = grid.querySelector(`.crossword-cell[data-cell="${selectorValue}"]`);

    if (input) {
      input.value = value;
    }

    if (cell) {
      cell.classList.toggle("has-letter", Boolean(value));
    }
  }

  /**
   * Applies active-entry and current-cell state without reconstructing the grid.
   *
   * @param {object} selection - Current interaction selection.
   * @param {string|null} selection.activeEntryId - Active clue identifier.
   * @param {string|null} selection.activeCellKey - Active cell identifier.
   * @param {Set<string>} selection.solvedEntryIds - Solved entry identifiers.
   * @returns {void}
   */
  function updateSelection({ activeEntryId, activeCellKey, solvedEntryIds }) {
    grid.querySelectorAll(".crossword-cell").forEach((cell) => {
      const entryIds = cell.dataset.entryIds?.split(" ") ?? [];
      const isActiveEntry = Boolean(activeEntryId && entryIds.includes(activeEntryId));
      const isCurrentCell = cell.dataset.cell === activeCellKey;

      cell.classList.toggle("is-active-entry", isActiveEntry);
      cell.classList.toggle("is-current-cell", isCurrentCell);
      cell.classList.toggle(
        "is-solved",
        entryIds.some((entryId) => solvedEntryIds.has(entryId)),
      );
    });

    [acrossClues, downClues].forEach((list) => {
      list.querySelectorAll(".clue-button").forEach((button) => {
        const isActive = button.dataset.entryId === activeEntryId;
        button.toggleAttribute("aria-current", isActive);
      });
    });
  }

  /**
   * Updates solved clue and grid-cell visual state.
   *
   * @param {Set<string>} solvedEntryIds - Solved entry identifiers.
   * @returns {void}
   */
  function updateSolvedEntries(solvedEntryIds) {
    [acrossClues, downClues].forEach((list) => {
      list.querySelectorAll(".clue-button").forEach((button) => {
        const isSolved = solvedEntryIds.has(button.dataset.entryId);
        button.classList.toggle("is-solved", isSolved);
        button.setAttribute("aria-label", `${button.textContent}${isSolved ? ", solved" : ""}`);
      });
    });

    grid.querySelectorAll(".crossword-cell").forEach((cell) => {
      const entryIds = cell.dataset.entryIds?.split(" ") ?? [];
      cell.classList.toggle(
        "is-solved",
        entryIds.some((entryId) => solvedEntryIds.has(entryId)),
      );
    });
  }

  /**
   * Updates the polite status announcement region.
   *
   * @param {string} message - Status message for players.
   * @returns {void}
   */
  function setStatus(message) {
    status.textContent = message;
  }

  /**
   * Applies or clears the page's completion state.
   *
   * @param {boolean} isComplete - Whether every entry is solved.
   * @returns {void}
   */
  function setCompletionState(isComplete) {
    status.classList.toggle("puzzle-complete", isComplete);
    grid.classList.toggle("is-complete", isComplete);
  }

  /**
   * Clears player-only visual state while retaining the rendered puzzle structure.
   *
   * @returns {void}
   */
  function resetPuzzle() {
    grid.querySelectorAll(".crossword-input").forEach((input) => {
      input.value = "";
    });

    grid.querySelectorAll(".crossword-cell").forEach((cell) => {
      cell.classList.remove("has-letter", "is-active-entry", "is-current-cell", "is-solved");
    });

    [acrossClues, downClues].forEach((list) => {
      list.querySelectorAll(".clue-button").forEach((button) => {
        button.classList.remove("is-solved");
        button.removeAttribute("aria-current");
        button.removeAttribute("aria-label");
      });
    });
  }

  return Object.freeze({
    render,
    updateCellValue,
    updateSelection,
    updateSolvedEntries,
    setStatus,
    setCompletionState,
    resetPuzzle,
    directions: Object.freeze([...DIRECTIONS]),
  });
}
