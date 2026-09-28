const DIRECTIONS = new Set(["across", "down"]);
const LETTERS_ONLY = /^[a-z]+$/i;

/**
 * Creates a canonical coordinate key from one-based crossword coordinates.
 *
 * @param {number} x - One-based horizontal coordinate.
 * @param {number} y - One-based vertical coordinate.
 * @returns {string} The stable coordinate key.
 */
function toCellKey(x, y) {
  return `${x},${y}`;
}

/**
 * Throws a descriptive error when an entry violates the authoring contract.
 *
 * @param {unknown} condition - Condition which must be truthy.
 * @param {string} message - Validation failure message.
 * @returns {void}
 */
function assertValid(condition, message) {
  if (!condition) {
    throw new Error(`Invalid crossword puzzle: ${message}`);
  }
}

/**
 * Normalizes a source entry without mutating the author-authored object.
 *
 * @param {unknown} rawEntry - Source puzzle entry.
 * @param {number} index - Entry index used for diagnostics.
 * @returns {object} A normalized entry suitable for path creation.
 */
function normalizeEntry(rawEntry, index) {
  assertValid(
    rawEntry && typeof rawEntry === "object" && !Array.isArray(rawEntry),
    `entry ${index + 1} must be an object.`,
  );

  const { clue, answer, position, orientation, startx, starty } = rawEntry;

  assertValid(
    typeof clue === "string" && clue.trim().length > 0,
    `entry ${index + 1} must have a non-empty clue.`,
  );
  assertValid(
    typeof answer === "string" && LETTERS_ONLY.test(answer),
    `entry ${index + 1} must have a non-empty letters-only answer.`,
  );
  assertValid(
    Number.isInteger(position) && position > 0,
    `entry ${index + 1} must have a positive integer position.`,
  );
  assertValid(
    DIRECTIONS.has(orientation),
    `entry ${index + 1} has unsupported orientation "${orientation}".`,
  );
  assertValid(
    Number.isInteger(startx) && startx > 0 && Number.isInteger(starty) && starty > 0,
    `entry ${index + 1} must start at positive integer coordinates.`,
  );

  const normalizedAnswer = answer.toUpperCase();
  const id = `${position}-${orientation}`;

  return {
    id,
    clue: clue.trim(),
    answer: normalizedAnswer,
    position,
    direction: orientation,
    startx,
    starty,
  };
}

/**
 * Builds the ordered cells occupied by an entry.
 *
 * @param {object} entry - Normalized crossword entry.
 * @returns {Array<object>} Ordered path cells with expected letters.
 */
function createEntryPath(entry) {
  return [...entry.answer].map((letter, index) => {
    const x = entry.startx + (entry.direction === "across" ? index : 0);
    const y = entry.starty + (entry.direction === "down" ? index : 0);

    return Object.freeze({
      key: toCellKey(x, y),
      x,
      y,
      letter,
      index,
    });
  });
}

/**
 * Freezes a cell while protecting its nested references from mutation.
 *
 * @param {object} cell - Mutable derived cell.
 * @returns {object} Immutable cell.
 */
function freezeCell(cell) {
  return Object.freeze({
    ...cell,
    entryIds: Object.freeze([...cell.entryIds]),
  });
}

/**
 * Creates an immutable, validated crossword model from source entries.
 *
 * @param {Array<object>} entries - Author-authored crossword entry records.
 * @returns {object} Immutable puzzle model with dimensions, cells, and ordered clues.
 * @throws {Error} If entries are malformed or contain conflicting geometry.
 */
export function createPuzzleModel(entries) {
  assertValid(Array.isArray(entries) && entries.length > 0, "entries must be a non-empty array.");

  const entryIds = new Set();
  const normalizedEntries = entries.map((rawEntry, index) => {
    const entry = normalizeEntry(rawEntry, index);
    assertValid(!entryIds.has(entry.id), `duplicate entry identity "${entry.id}".`);
    entryIds.add(entry.id);
    return entry;
  });

  const cellMap = new Map();
  let width = 0;
  let height = 0;

  const modeledEntries = normalizedEntries.map((entry) => {
    const path = createEntryPath(entry);

    path.forEach((pathCell) => {
      width = Math.max(width, pathCell.x);
      height = Math.max(height, pathCell.y);

      const existingCell = cellMap.get(pathCell.key);
      if (existingCell) {
        assertValid(
          existingCell.letter === pathCell.letter,
          `entries "${existingCell.entryIds.join('" and "')}" and "${entry.id}" conflict at ${pathCell.key}.`,
        );
        existingCell.entryIds.push(entry.id);
        return;
      }

      cellMap.set(pathCell.key, {
        key: pathCell.key,
        x: pathCell.x,
        y: pathCell.y,
        letter: pathCell.letter,
        entryIds: [entry.id],
      });
    });

    return {
      ...entry,
      path: Object.freeze(path),
    };
  });

  const numbersByCell = new Map();
  const entriesById = new Map();

  modeledEntries.forEach((entry) => {
    const startCellKey = entry.path[0].key;
    const existingNumber = numbersByCell.get(startCellKey);
    assertValid(
      existingNumber === undefined || existingNumber === entry.position,
      `entries beginning at ${startCellKey} must share the same position number.`,
    );
    numbersByCell.set(startCellKey, entry.position);
    entriesById.set(entry.id, entry);
  });

  const numberedCells = new Map(
    [...cellMap.entries()].map(([key, cell]) => [
      key,
      freezeCell({
        ...cell,
        number: numbersByCell.get(key) ?? null,
      }),
    ]),
  );

  const byPositionThenDirection = (left, right) =>
    left.position - right.position || left.direction.localeCompare(right.direction);

  const acrossEntries = modeledEntries
    .filter((entry) => entry.direction === "across")
    .sort(byPositionThenDirection);
  const downEntries = modeledEntries
    .filter((entry) => entry.direction === "down")
    .sort(byPositionThenDirection);

  const frozenEntries = Object.freeze(
    modeledEntries.map((entry) =>
      Object.freeze({
        ...entry,
        path: Object.freeze([...entry.path]),
      }),
    ),
  );

  const frozenEntriesById = new Map(frozenEntries.map((entry) => [entry.id, entry]));

  return Object.freeze({
    width,
    height,
    entries: frozenEntries,
    entriesById: frozenEntriesById,
    cells: new Map(numberedCells),
    acrossEntries: Object.freeze(
      acrossEntries.map((entry) => frozenEntriesById.get(entry.id)),
    ),
    downEntries: Object.freeze(
      downEntries.map((entry) => frozenEntriesById.get(entry.id)),
    ),
  });
}
