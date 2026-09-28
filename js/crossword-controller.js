const LETTER_PATTERN = /^[A-Za-z]$/;
const DIRECTION_ORDER = Object.freeze(["across", "down"]);

/**
 * Creates an accessible crossword interaction controller.
 *
 * @param {object} options - Controller dependencies.
 * @param {object} options.model - Validated puzzle model.
 * @param {object} options.renderer - Crossword renderer update API.
 * @param {HTMLElement} options.grid - Crossword grid mount point.
 * @param {HTMLElement} options.acrossClues - Across clue-list mount point.
 * @param {HTMLElement} options.downClues - Down clue-list mount point.
 * @param {HTMLButtonElement} options.checkButton - Active-entry check control.
 * @param {HTMLButtonElement} options.resetButton - Puzzle reset control.
 * @returns {object} Controller API.
 */
export function createCrosswordController({
  model,
  renderer,
  grid,
  acrossClues,
  downClues,
  checkButton,
  resetButton,
}) {
  if (!model || !renderer || !grid || !acrossClues || !downClues || !checkButton || !resetButton) {
    throw new Error("Crossword controller requires model, renderer, mounts, and controls.");
  }

  const state = {
    activeEntryId: null,
    activeCellKey: null,
    direction: "across",
    cellValues: new Map(),
    solvedEntryIds: new Set(),
    isComplete: false,
  };

  const getEntry = (entryId) => model.entriesById.get(entryId) ?? null;

  const getInput = (cellKey) =>
    grid.querySelector(`.crossword-input[data-cell="${CSS.escape(cellKey)}"]`);

  const getEntryForCell = (cellKey, direction) => {
    const cell = model.cells.get(cellKey);
    if (!cell) {
      return null;
    }

    return cell.entryIds
      .map((entryId) => getEntry(entryId))
      .find((entry) => entry.direction === direction) ?? null;
  };

  const getCellIndex = (entry, cellKey) =>
    entry.path.findIndex((pathCell) => pathCell.key === cellKey);

  const selectEntry = (entryId, preferredCellKey = null, shouldFocus = true) => {
    const entry = getEntry(entryId);
    if (!entry) {
      return;
    }

    state.activeEntryId = entry.id;
    state.direction = entry.direction;
    state.activeCellKey = entry.path.some((cell) => cell.key === preferredCellKey)
      ? preferredCellKey
      : entry.path[0].key;

    renderer.updateSelection({
      activeEntryId: state.activeEntryId,
      activeCellKey: state.activeCellKey,
      solvedEntryIds: state.solvedEntryIds,
    });
    renderer.setStatus(`${entry.position} ${entry.direction}: ${entry.clue}`);

    if (shouldFocus) {
      getInput(state.activeCellKey)?.focus();
    }
  };

  const selectCell = (cellKey, shouldFocus = true) => {
    const cell = model.cells.get(cellKey);
    if (!cell) {
      return;
    }

    const activeEntry = getEntry(state.activeEntryId);
    const activeCellContainsEntry = activeEntry?.path.some((pathCell) => pathCell.key === cellKey);

    if (activeCellContainsEntry && cell.entryIds.length > 1) {
      const alternateDirection = state.direction === "across" ? "down" : "across";
      const alternateEntry = getEntryForCell(cellKey, alternateDirection);
      if (alternateEntry) {
        selectEntry(alternateEntry.id, cellKey, shouldFocus);
        return;
      }
    }

    const selectedEntry =
      getEntryForCell(cellKey, state.direction) ??
      DIRECTION_ORDER.map((direction) => getEntryForCell(cellKey, direction)).find(Boolean);

    if (selectedEntry) {
      selectEntry(selectedEntry.id, cellKey, shouldFocus);
    }
  };

  const moveWithinActiveEntry = (offset) => {
    const entry = getEntry(state.activeEntryId);
    if (!entry || !state.activeCellKey) {
      return;
    }

    const currentIndex = getCellIndex(entry, state.activeCellKey);
    const nextIndex = Math.min(Math.max(currentIndex + offset, 0), entry.path.length - 1);

    state.activeCellKey = entry.path[nextIndex].key;
    renderer.updateSelection({
      activeEntryId: state.activeEntryId,
      activeCellKey: state.activeCellKey,
      solvedEntryIds: state.solvedEntryIds,
    });
    getInput(state.activeCellKey)?.focus();
  };

  const setCellValue = (cellKey, value) => {
    if (!model.cells.has(cellKey)) {
      return;
    }

    if (value) {
      state.cellValues.set(cellKey, value);
    } else {
      state.cellValues.delete(cellKey);
    }

    renderer.updateCellValue(cellKey, value);
  };

  const isEntrySolved = (entry) =>
    entry.path.every((pathCell) => state.cellValues.get(pathCell.key) === pathCell.letter);

  const updateSolvedEntries = () => {
    const newlySolved = [];

    model.entries.forEach((entry) => {
      if (isEntrySolved(entry) && !state.solvedEntryIds.has(entry.id)) {
        state.solvedEntryIds.add(entry.id);
        newlySolved.push(entry);
      }
    });

    renderer.updateSolvedEntries(state.solvedEntryIds);

    const wasComplete = state.isComplete;
    state.isComplete = model.entries.every((entry) => state.solvedEntryIds.has(entry.id));

    if (state.isComplete && !wasComplete) {
      renderer.setCompletionState(true);
      renderer.setStatus("Congratulations! You completed the crossword.");
      return;
    }

    if (newlySolved.length > 0) {
      const entry = newlySolved[0];
      renderer.setStatus(`Correct: ${entry.position} ${entry.direction}.`);
    }
  };

  const checkActiveEntry = () => {
    const entry = getEntry(state.activeEntryId);
    if (!entry) {
      renderer.setStatus("Select a clue or grid square before checking an entry.");
      return;
    }

    if (isEntrySolved(entry)) {
      state.solvedEntryIds.add(entry.id);
      renderer.updateSolvedEntries(state.solvedEntryIds);
      updateSolvedEntries();
      if (!state.isComplete) {
        renderer.setStatus(`Correct: ${entry.position} ${entry.direction}.`);
      }
      return;
    }

    const isComplete = entry.path.every((pathCell) => state.cellValues.has(pathCell.key));
    renderer.setStatus(
      isComplete
        ? `${entry.position} ${entry.direction} is not correct yet.`
        : `${entry.position} ${entry.direction} is incomplete.`,
    );
  };

  const reset = () => {
    state.cellValues.clear();
    state.solvedEntryIds.clear();
    state.isComplete = false;

    renderer.resetPuzzle();
    renderer.setCompletionState(false);

    const firstEntry = model.acrossEntries[0] ?? model.entries[0];
    if (firstEntry) {
      selectEntry(firstEntry.id, firstEntry.path[0].key, true);
      renderer.setStatus(`Puzzle reset. ${firstEntry.position} ${firstEntry.direction}: ${firstEntry.clue}`);
    }
  };

  const handleInput = (event) => {
    const input = event.target.closest(".crossword-input");
    if (!input) {
      return;
    }

    const normalizedValue = input.value.trim().slice(-1).toUpperCase();
    if (!LETTER_PATTERN.test(normalizedValue)) {
      input.value = state.cellValues.get(input.dataset.cell) ?? "";
      return;
    }

    const activeEntry = getEntry(state.activeEntryId);
    const isInActiveEntry = activeEntry?.path.some(
      (pathCell) => pathCell.key === input.dataset.cell,
    );

    if (!isInActiveEntry) {
      selectCell(input.dataset.cell, false);
    } else {
      state.activeCellKey = input.dataset.cell;
    }

    setCellValue(input.dataset.cell, normalizedValue);
    updateSolvedEntries();

    if (state.isComplete) {
      return;
    }

    const entry = getEntry(state.activeEntryId);
    const cellIndex = entry ? getCellIndex(entry, input.dataset.cell) : -1;
    if (entry && cellIndex >= 0 && cellIndex < entry.path.length - 1) {
      moveWithinActiveEntry(1);
    }
  };

  const handleKeydown = (event) => {
    const input = event.target.closest(".crossword-input");
    if (!input) {
      return;
    }

    const activeEntry = getEntry(state.activeEntryId);
    const isInActiveEntry = activeEntry?.path.some(
      (pathCell) => pathCell.key === input.dataset.cell,
    );

    // Selecting an already-active intersection toggles its direction for pointer use.
    // Keyboard navigation must retain the current entry and direction instead.
    if (!isInActiveEntry) {
      selectCell(input.dataset.cell, false);
    } else {
      state.activeCellKey = input.dataset.cell;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveWithinActiveEntry(-1);
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveWithinActiveEntry(1);
    } else if (event.key === "Backspace") {
      event.preventDefault();

      if (state.cellValues.has(input.dataset.cell)) {
        setCellValue(input.dataset.cell, "");
      } else {
        moveWithinActiveEntry(-1);
        if (state.activeCellKey) {
          setCellValue(state.activeCellKey, "");
        }
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      checkActiveEntry();
    }
  };

  const handleGridClick = (event) => {
    const input = event.target.closest(".crossword-input");
    if (input) {
      selectCell(input.dataset.cell, true);
    }
  };

  const handleClueClick = (event) => {
    const button = event.target.closest(".clue-button");
    if (button?.dataset.entryId) {
      selectEntry(button.dataset.entryId);
    }
  };

  grid.addEventListener("input", handleInput);
  grid.addEventListener("keydown", handleKeydown);
  grid.addEventListener("click", handleGridClick);
  acrossClues.addEventListener("click", handleClueClick);
  downClues.addEventListener("click", handleClueClick);
  checkButton.addEventListener("click", checkActiveEntry);
  resetButton.addEventListener("click", reset);

  const firstEntry = model.acrossEntries[0] ?? model.entries[0];
  if (firstEntry) {
    selectEntry(firstEntry.id, firstEntry.path[0].key, false);
  }

  return Object.freeze({
    reset,
    checkActiveEntry,
  });
}
