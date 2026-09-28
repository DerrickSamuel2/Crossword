import { createCrosswordController } from "./crossword-controller.js";
import { PUZZLE_ENTRIES } from "./puzzle-data.js";
import { createPuzzleModel } from "./puzzle-model.js";
import { createCrosswordRenderer } from "./crossword-renderer.js";

/**
 * Finds a required page-shell element or throws a clear integration error.
 *
 * @param {string} id - Required element identifier.
 * @returns {HTMLElement} The matching page-shell element.
 */
function getRequiredElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Crossword application is missing required element "#${id}".`);
  }

  return element;
}

/**
 * Renders a user-visible initialization error without partially rendering a puzzle.
 *
 * @param {Error} error - Initialization failure.
 * @returns {void}
 */
function renderInitializationError(error) {
  const grid = document.getElementById("crossword-grid");
  const status = document.getElementById("puzzle-status");
  const message = "The crossword could not be loaded. Check the puzzle data.";

  if (grid) {
    const errorMessage = document.createElement("p");
    errorMessage.className = "grid-error";
    errorMessage.setAttribute("role", "alert");
    errorMessage.textContent = message;
    grid.replaceChildren(errorMessage);
  }

  if (status) {
    status.textContent = message;
  }

  console.error(error);
}

/**
 * Initializes the validated model, renderer, and accessible interaction controller.
 *
 * @returns {void}
 */
function initializeCrossword() {
  try {
    const model = createPuzzleModel(PUZZLE_ENTRIES);
    const grid = getRequiredElement("crossword-grid");
    const acrossClues = getRequiredElement("across-clues");
    const downClues = getRequiredElement("down-clues");
    const status = getRequiredElement("puzzle-status");
    const renderer = createCrosswordRenderer({
      grid,
      acrossClues,
      downClues,
      status,
    });

    renderer.render(model);
    createCrosswordController({
      model,
      renderer,
      grid,
      acrossClues,
      downClues,
      checkButton: getRequiredElement("check-entry"),
      resetButton: getRequiredElement("reset-puzzle"),
    });
  } catch (error) {
    renderInitializationError(error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeCrossword, { once: true });
} else {
  initializeCrossword();
}
