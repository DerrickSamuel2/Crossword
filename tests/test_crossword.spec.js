const { test, expect } = require("@playwright/test");

const entries = [
  { clue: "First letter of Greek alphabet", answer: "alpha" },
  { clue: "Not a one ___ motor, but a three ___ motor", answer: "phase" },
  { clue: "Created from a separation of charge", answer: "capacitance" },
  { clue: "The speeds of engines without an acceleration", answer: "idlespeeds" },
  { clue: "Complex resistances", answer: "impedances" },
  { clue: "This device is used to step-up, step-down, and/or isolate", answer: "transformer" },
  { clue: "Type of ray emitted from the sun", answer: "gamma" },
  { clue: "C programming language operator", answer: "cysan" },
  { clue: "Defines the alphanumeric characters typically associated with text used in programming", answer: "ascii" },
  { clue: "Generally, if you go over 1kV per cm this happens", answer: "arc" },
  { clue: "Control system strategy that tries to replicate human thought process (abbr.)", answer: "ann" },
  { clue: "Greek variable that usually describes rotor position", answer: "theta" },
  { clue: "Electromagnetic (abbr.)", answer: "em" },
  { clue: "No. 13 across does this to a voltage", answer: "steps" },
  { clue: "Emits a loud wailing sound", answer: "siren" },
  { clue: "Information technology (abbr.)", answer: "it" },
  { clue: "Asynchronous transfer mode (abbr.)", answer: "atm" },
  { clue: "Offset current control (abbr.)", answer: "occ" }
];

function clueButton(page, clue) {
  return page.getByRole("button", { name: new RegExp(clue) });
}

async function completeEntry(page, clue, answer) {
  const clueLocator = clueButton(page, clue);
  await clueLocator.click();
  await expect(clueLocator).toHaveAttribute("aria-current", "true");
  await page.keyboard.type(answer);
  await expect(clueLocator).toHaveClass(/is-solved/);
}

test.describe("Engineering Crossword", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders a numbered grid and separate Across and Down clue groups", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Engineering Crossword" })).toBeVisible();
    await expect(page.locator("#puzzle")).toBeVisible();
    await expect(page.locator("#puzzle input")).toHaveCount(76);
    await expect(page.locator(".cell-number").first()).toHaveText("1");

    await expect(page.getByRole("heading", { name: "Across" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Down" })).toBeVisible();
    await expect(page.locator("#puzzle-clues .clue-button")).toHaveCount(18);
    await expect(page.getByText("Select a clue or a square to begin.")).toBeVisible();
  });

  test("synchronizes clue selection, cell selection, and keyboard movement", async ({ page }) => {
    const firstAcross = clueButton(page, "First letter of Greek alphabet");
    await firstAcross.click();

    await expect(firstAcross).toHaveAttribute("aria-current", "true");
    await expect(page.locator('input[data-cell-key="1,1"]')).toBeFocused();
    await expect(page.locator('td[data-cell-key="1,1"]')).toHaveClass(/cell-current/);

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator('input[data-cell-key="5,1"]')).toBeFocused();

    await page.keyboard.press("ArrowDown");
    const firstDown = clueButton(page, "Generally, if you go over 1kV per cm this happens");
    await expect(firstDown).toHaveAttribute("aria-current", "true");
    await expect(page.locator('input[data-cell-key="5,2"]')).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.locator(".clue-button[aria-current='true']")).toBeVisible();
    await expect(page.locator("#puzzle input")).toHaveCount(76);
  });

  test("normalizes answers, marks solved entries, and announces whole-puzzle completion", async ({ page }) => {
    const firstAcross = clueButton(page, "First letter of Greek alphabet");
    await firstAcross.click();
    await page.keyboard.type("a1lPhA");

    await expect(firstAcross).toHaveClass(/is-solved/);
    await expect(page.locator('input[data-cell-key="1,1"]')).toHaveValue("A");
    await expect(page.locator('input[data-cell-key="2,1"]')).toHaveValue("L");
    await expect(page.locator('input[data-cell-key="3,1"]')).toHaveValue("P");
    await expect(page.locator('input[data-cell-key="4,1"]')).toHaveValue("H");
    await expect(page.locator('input[data-cell-key="5,1"]')).toHaveValue("A");
    await expect(page.locator('td[data-cell-key="2,1"]')).toHaveClass(/entry-solved/);

    for (const entry of entries.slice(1)) {
      await completeEntry(page, entry.clue, entry.answer);
    }

    await expect(page.locator("#puzzle-status")).toHaveText(
      "Congratulations! You completed the crossword."
    );
    await expect(page.locator("#puzzle-status")).toHaveClass(/is-complete/);
    await expect(page.locator(".clue-button.is-solved")).toHaveCount(18);
  });

  test("stacks the grid and clue panel at a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 850 });

    const layout = await page.locator(".crossword-game").evaluate((element) => {
      const puzzle = element.querySelector("#puzzle-wrapper").getBoundingClientRect();
      const clues = element.querySelector("#puzzle-clues").getBoundingClientRect();

      return {
        gridTemplateColumns: window.getComputedStyle(element).gridTemplateColumns,
        puzzleBottom: puzzle.bottom,
        cluesTop: clues.top
      };
    });

    await expect(page.locator("#puzzle")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Across" })).toBeVisible();
    expect(layout.gridTemplateColumns.split(" ").length).toBe(1);
    expect(layout.cluesTop).toBeGreaterThan(layout.puzzleBottom);
  });
});
