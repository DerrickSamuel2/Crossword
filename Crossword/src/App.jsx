import React, { useMemo, useState } from "react";

const puzzleData = [
  { clue: "First letter of greek alphabet", answer: "alpha", position: 1, orientation: "across", startx: 1, starty: 1 },
  { clue: "Not a one ___ motor, but a three ___ motor", answer: "phase", position: 3, orientation: "across", startx: 7, starty: 1 },
  { clue: "Created from a separation of charge", answer: "capacitance", position: 5, orientation: "across", startx: 1, starty: 3 },
  { clue: "The speeds of engines without and accelaration", answer: "idlespeeds", position: 8, orientation: "across", startx: 1, starty: 5 },
  { clue: "Complex resistances", answer: "impedances", position: 10, orientation: "across", startx: 2, starty: 7 },
  { clue: "This device is used to step-up, step-down, and/or isolate", answer: "transformer", position: 13, orientation: "across", startx: 1, starty: 9 },
  { clue: "Type of ray emitted frm the sun", answer: "gamma", position: 16, orientation: "across", startx: 1, starty: 11 },
  { clue: "C programming language operator", answer: "cysan", position: 17, orientation: "across", startx: 7, starty: 11 },
  { clue: "Defines the alpha-numeric characters that are typically associated with text used in programming", answer: "ascii", position: 1, orientation: "down", startx: 1, starty: 1 },
  { clue: "Generally, if you go over 1kV per cm this happens", answer: "arc", position: 2, orientation: "down", startx: 5, starty: 1 },
  { clue: "Control system strategy that tries to replicate the human through process (abbr.)", answer: "ann", position: 4, orientation: "down", startx: 9, starty: 1 },
  { clue: "Greek variable that usually describes rotor positon", answer: "theta", position: 6, orientation: "down", startx: 7, starty: 3 },
  { clue: "Electromagnetic (abbr.)", answer: "em", position: 7, orientation: "down", startx: 11, starty: 3 },
  { clue: "No. 13 across does this to a voltage", answer: "steps", position: 9, orientation: "down", startx: 5, starty: 5 },
  { clue: "Emits a lout wailing sound", answer: "siren", position: 11, orientation: "down", startx: 11, starty: 7 },
  { clue: "Information technology (abbr.)", answer: "it", position: 12, orientation: "down", startx: 1, starty: 8 },
  { clue: "Asynchronous transfer mode (abbr.)", answer: "atm", position: 14, orientation: "down", startx: 3, starty: 9 },
  { clue: "Offset current control (abbr.)", answer: "occ", position: 15, orientation: "down", startx: 7, starty: 9 }
];

function buildPuzzle(entries) {
  const sorted = [...entries].sort((a, b) => a.position - b.position);
  const cellMap = new Map();

  sorted.forEach((entry, entryIndex) => {
    const answer = entry.answer.toUpperCase();
    for (let i = 0; i < answer.length; i += 1) {
      const x = entry.orientation === "across" ? entry.startx + i : entry.startx;
      const y = entry.orientation === "down" ? entry.starty + i : entry.starty;
      const key = `${x},${y}`;

      if (!cellMap.has(key)) {
        cellMap.set(key, {
          x,
          y,
          key,
          number: null,
          entries: [],
          value: ""
        });
      }

      const cell = cellMap.get(key);
      cell.entries.push({
        entryIndex,
        charIndex: i
      });

      if (i === 0 && cell.number === null) {
        cell.number = entry.position;
      }
    }
  });

  const maxX = Math.max(...[...cellMap.values()].map((c) => c.x));
  const maxY = Math.max(...[...cellMap.values()].map((c) => c.y));

  const grid = [];
  for (let y = 1; y <= maxY; y += 1) {
    const row = [];
    for (let x = 1; x <= maxX; x += 1) {
      row.push(cellMap.get(`${x},${y}`) || null);
    }
    grid.push(row);
  }

  return { sortedEntries: sorted, grid, cellMap };
}

// PUBLIC_INTERFACE
export default function App() {
  /** Main crossword application component rendering puzzle grid, clue panels, and controls. */
  const { sortedEntries, grid, cellMap } = useMemo(() => buildPuzzle(puzzleData), []);
  const [values, setValues] = useState(() => {
    const initial = {};
    [...cellMap.values()].forEach((cell) => {
      initial[cell.key] = "";
    });
    return initial;
  });
  const [activeEntryIndex, setActiveEntryIndex] = useState(0);
  const [orientation, setOrientation] = useState("across");

  const solvedSet = useMemo(() => {
    const solved = new Set();
    sortedEntries.forEach((entry, entryIndex) => {
      const answer = entry.answer.toUpperCase();
      const letters = answer.split("").map((_, i) => {
        const x = entry.orientation === "across" ? entry.startx + i : entry.startx;
        const y = entry.orientation === "down" ? entry.starty + i : entry.starty;
        return values[`${x},${y}`] || "";
      });
      if (letters.join("") === answer) {
        solved.add(entryIndex);
      }
    });
    return solved;
  }, [sortedEntries, values]);

  const activeEntryCells = useMemo(() => {
    const entry = sortedEntries[activeEntryIndex];
    if (!entry) {
      return [];
    }
    return entry.answer.split("").map((_, i) => {
      const x = entry.orientation === "across" ? entry.startx + i : entry.startx;
      const y = entry.orientation === "down" ? entry.starty + i : entry.starty;
      return `${x},${y}`;
    });
  }, [activeEntryIndex, sortedEntries]);

  const activeEntry = sortedEntries[activeEntryIndex];

  const moveInEntry = (cellKey, direction = 1) => {
    const idx = activeEntryCells.indexOf(cellKey);
    if (idx === -1) {
      return;
    }
    const next = idx + direction;
    if (next >= 0 && next < activeEntryCells.length) {
      const nextInput = document.getElementById(`cell-${activeEntryCells[next]}`);
      nextInput?.focus();
      nextInput?.select();
    }
  };

  const focusEntryStart = (entryIndex) => {
    const entry = sortedEntries[entryIndex];
    if (!entry) {
      return;
    }
    const startKey = `${entry.startx},${entry.starty}`;
    const input = document.getElementById(`cell-${startKey}`);
    input?.focus();
    input?.select();
  };

  const handleCellFocus = (cell, preferredOrientation = orientation) => {
    const targetEntry = cell.entries
      .map((entryRef) => entryRef.entryIndex)
      .find((idx) => sortedEntries[idx].orientation === preferredOrientation);

    const nextActive = targetEntry ?? cell.entries[0]?.entryIndex ?? 0;
    setActiveEntryIndex(nextActive);
    setOrientation(sortedEntries[nextActive].orientation);
  };

  const handleInputChange = (cell, rawValue) => {
    const value = (rawValue || "").slice(-1).toUpperCase().replace(/[^A-Z]/g, "");
    setValues((prev) => ({
      ...prev,
      [cell.key]: value
    }));
    if (value) {
      moveInEntry(cell.key, 1);
    }
  };

  const handleKeyDown = (event, cell) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setOrientation("across");
      moveInEntry(cell.key, 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setOrientation("across");
      moveInEntry(cell.key, -1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setOrientation("down");
      const downEntry = cell.entries.find((e) => sortedEntries[e.entryIndex].orientation === "down");
      if (downEntry) {
        setActiveEntryIndex(downEntry.entryIndex);
        const nextKey = `${cell.x},${cell.y + 1}`;
        const nextInput = document.getElementById(`cell-${nextKey}`);
        nextInput?.focus();
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOrientation("down");
      const downEntry = cell.entries.find((e) => sortedEntries[e.entryIndex].orientation === "down");
      if (downEntry) {
        setActiveEntryIndex(downEntry.entryIndex);
        const prevKey = `${cell.x},${cell.y - 1}`;
        const prevInput = document.getElementById(`cell-${prevKey}`);
        prevInput?.focus();
      }
    } else if (event.key === "Backspace") {
      if (!values[cell.key]) {
        moveInEntry(cell.key, -1);
      }
    } else if (event.key === "Tab") {
      event.preventDefault();
      const nextIndex = (activeEntryIndex + 1) % sortedEntries.length;
      setActiveEntryIndex(nextIndex);
      setOrientation(sortedEntries[nextIndex].orientation);
      focusEntryStart(nextIndex);
    }
  };

  const acrossEntries = sortedEntries
    .map((entry, index) => ({ ...entry, entryIndex: index }))
    .filter((entry) => entry.orientation === "across");

  const downEntries = sortedEntries
    .map((entry, index) => ({ ...entry, entryIndex: index }))
    .filter((entry) => entry.orientation === "down");

  const solvedCount = solvedSet.size;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1 className="app-title">Qurossword</h1>
          <p className="app-subtitle">Challenge yourself with this interactive crossword puzzle.</p>
        </div>
        <div className="stats-card" aria-live="polite">
          <span className="stats-label">Progress</span>
          <strong className="stats-value">{solvedCount} / {sortedEntries.length} solved</strong>
        </div>
      </header>

      <main className="puzzle-layout">
        <section className="puzzle-panel" aria-label="Crossword puzzle board">
          <div className="board-scroll">
            <table className="puzzle-table">
              <tbody>
                {grid.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {row.map((cell, colIndex) => {
                      if (!cell) {
                        return <td key={`blank-${rowIndex}-${colIndex}`} className="cell-block" />;
                      }

                      const isActive = activeEntryCells.includes(cell.key);
                      const isSolved = cell.entries.some((entryRef) => solvedSet.has(entryRef.entryIndex));

                      return (
                        <td key={cell.key} className="cell-light">
                          {cell.number !== null && <span className="cell-number">{cell.number}</span>}
                          <input
                            id={`cell-${cell.key}`}
                            value={values[cell.key] ?? ""}
                            onFocus={() => handleCellFocus(cell)}
                            onChange={(event) => handleInputChange(cell, event.target.value)}
                            onKeyDown={(event) => handleKeyDown(event, cell)}
                            className={`${isActive ? "active" : ""} ${isSolved ? "done" : ""}`}
                            aria-label={`Cell ${cell.x}, ${cell.y}`}
                            maxLength={1}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="clues-panel" aria-label="Crossword clues">
          <div className="clue-section">
            <h2>Across</h2>
            <ol>
              {acrossEntries.map((entry) => (
                <li
                  key={`across-${entry.entryIndex}`}
                  className={`${entry.entryIndex === activeEntryIndex ? "clues-active" : ""} ${solvedSet.has(entry.entryIndex) ? "clue-done" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveEntryIndex(entry.entryIndex);
                      setOrientation("across");
                      focusEntryStart(entry.entryIndex);
                    }}
                  >
                    {entry.clue}
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <div className="clue-section">
            <h2>Down</h2>
            <ol>
              {downEntries.map((entry) => (
                <li
                  key={`down-${entry.entryIndex}`}
                  className={`${entry.entryIndex === activeEntryIndex ? "clues-active" : ""} ${solvedSet.has(entry.entryIndex) ? "clue-done" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveEntryIndex(entry.entryIndex);
                      setOrientation("down");
                      focusEntryStart(entry.entryIndex);
                    }}
                  >
                    {entry.clue}
                  </button>
                </li>
              ))}
            </ol>
          </div>

          {activeEntry && (
            <div className="active-hint">
              <span className="hint-badge">{activeEntry.orientation.toUpperCase()}</span>
              <p>
                <strong>{activeEntry.position}.</strong> {activeEntry.clue}
              </p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
