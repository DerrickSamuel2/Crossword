import test from "node:test";
import assert from "node:assert/strict";

import { PUZZLE_ENTRIES } from "../js/puzzle-data.js";
import { createPuzzleModel } from "../js/puzzle-model.js";

test("creates the expected immutable model for the supplied puzzle", () => {
  const sourceEntries = PUZZLE_ENTRIES.map((entry) => ({ ...entry }));
  const model = createPuzzleModel(sourceEntries);

  assert.equal(model.width, 11);
  assert.equal(model.height, 11);
  assert.equal(model.cells.size, 76);
  assert.equal(model.entries.length, 18);
  assert.equal(Object.isFrozen(model), true);
  assert.equal(Object.isFrozen(model.entries), true);

  assert.deepEqual(
    model.acrossEntries.map((entry) => entry.id),
    ["1-across", "3-across", "5-across", "8-across", "10-across", "13-across", "16-across", "17-across"],
  );
  assert.deepEqual(
    model.downEntries.map((entry) => entry.id),
    ["1-down", "2-down", "4-down", "6-down", "7-down", "9-down", "11-down", "12-down", "14-down", "15-down"],
  );

  assert.deepEqual(sourceEntries, PUZZLE_ENTRIES);
});

test("builds ordered paths, numbered start cells, and shared intersection metadata", () => {
  const model = createPuzzleModel(PUZZLE_ENTRIES);
  const alpha = model.entriesById.get("1-across");
  const sharedStart = model.cells.get("1,1");
  const capacitanceIntersection = model.cells.get("7,3");

  assert.deepEqual(
    alpha.path.map((cell) => cell.key),
    ["1,1", "2,1", "3,1", "4,1", "5,1"],
  );
  assert.deepEqual(
    alpha.path.map((cell) => cell.letter).join(""),
    "ALPHA",
  );

  assert.deepEqual(
    {
      number: sharedStart.number,
      letter: sharedStart.letter,
      entryIds: sharedStart.entryIds,
    },
    {
      number: 1,
      letter: "A",
      entryIds: ["1-across", "1-down"],
    },
  );
  assert.deepEqual(
    {
      number: capacitanceIntersection.number,
      letter: capacitanceIntersection.letter,
      entryIds: capacitanceIntersection.entryIds,
    },
    {
      number: 6,
      letter: "T",
      entryIds: ["5-across", "6-down"],
    },
  );
});

test("rejects malformed entries and incompatible overlaps with useful diagnostics", () => {
  assert.throws(
    () => createPuzzleModel([]),
    /entries must be a non-empty array/,
  );

  assert.throws(
    () =>
      createPuzzleModel([
        {
          clue: "Invalid orientation",
          answer: "word",
          position: 1,
          orientation: "diagonal",
          startx: 1,
          starty: 1,
        },
      ]),
    /unsupported orientation "diagonal"/,
  );

  assert.throws(
    () =>
      createPuzzleModel([
        {
          clue: "Across",
          answer: "alpha",
          position: 1,
          orientation: "across",
          startx: 1,
          starty: 1,
        },
        {
          clue: "Conflicting down",
          answer: "bravo",
          position: 2,
          orientation: "down",
          startx: 1,
          starty: 1,
        },
      ]),
    /conflict at 1,1/,
  );

  assert.throws(
    () =>
      createPuzzleModel([
        {
          clue: "First",
          answer: "word",
          position: 1,
          orientation: "across",
          startx: 1,
          starty: 1,
        },
        {
          clue: "Duplicate identity",
          answer: "test",
          position: 1,
          orientation: "across",
          startx: 1,
          starty: 2,
        },
      ]),
    /duplicate entry identity "1-across"/,
  );
});
