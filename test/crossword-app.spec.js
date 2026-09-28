import { expect, test } from "@playwright/test";

const cell = (page, coordinate) =>
  page.locator(`.crossword-input[data-cell="${coordinate}"]`);

const entryInputs = (page, entryId) =>
  page.locator(`.crossword-cell[data-entry-ids~="${entryId}"] .crossword-input`);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".crossword-table")).toBeVisible();
});

test("renders the numbered grid and directional clue controls from local assets", async ({ page }) => {
  await expect(page.locator("#crossword-grid")).toHaveAttribute("data-width", "11");
  await expect(page.locator("#crossword-grid")).toHaveAttribute("data-height", "11");
  await expect(page.locator(".crossword-input")).toHaveCount(76);
  await expect(page.locator("#across-clues .clue-button")).toHaveCount(8);
  await expect(page.locator("#down-clues .clue-button")).toHaveCount(10);
  await expect(page.locator(".crossword-cell[data-cell='1,1'] .cell-number")).toHaveText("1");
  await expect(page.locator("#puzzle-status")).toContainText("1 across");
});

test("selects clues, accepts letters, navigates with keys, and switches direction at intersections", async ({
  page,
}) => {
  await page.locator(".clue-button[data-entry-id='5-across']").click();
  await expect(page.locator(".clue-button[data-entry-id='5-across']")).toHaveAttribute(
    "aria-current",
    "",
  );

  const firstAcrossCell = cell(page, "1,3");
  await firstAcrossCell.pressSequentially("c");
  await expect(firstAcrossCell).toHaveValue("C");
  await expect(cell(page, "2,3")).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await expect(cell(page, "3,3")).toBeFocused();
  await page.keyboard.press("Backspace");
  await expect(cell(page, "2,3")).toBeFocused();

  await cell(page, "7,3").click();
  await expect(page.locator(".clue-button[data-entry-id='6-down']")).toHaveAttribute(
    "aria-current",
    "",
  );
  await expect(page.locator("#puzzle-status")).toContainText("6 down");
});

test("checks a solved entry and reset clears progress while restoring the initial selection", async ({
  page,
}) => {
  await page.locator(".clue-button[data-entry-id='1-across']").click();
  await entryInputs(page, "1-across").evaluateAll((inputs, letters) => {
    inputs.forEach((input, index) => {
      input.value = letters[index];
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }, ["A", "L", "P", "H", "A"]);

  await page.getByRole("button", { name: "Check entry" }).click();
  await expect(page.locator("#puzzle-status")).toContainText("Correct: 1 across.");
  await expect(page.locator(".clue-button[data-entry-id='1-across']")).toHaveClass(
    /(^|\s)is-solved(\s|$)/,
  );

  await page.getByRole("button", { name: "Reset puzzle" }).click();
  await expect(entryInputs(page, "1-across").first()).toHaveValue("");
  await expect(page.locator(".clue-button[data-entry-id='1-across']")).not.toHaveClass(
    /(^|\s)is-solved(\s|$)/,
  );
  await expect(page.locator("#puzzle-status")).toContainText("Puzzle reset. 1 across");
  await expect(cell(page, "1,1")).toBeFocused();
});

test("announces completion after every answer is entered correctly", async ({ page }) => {
  const entries = [
    ["1-across", "ALPHA"],
    ["3-across", "PHASE"],
    ["5-across", "CAPACITANCE"],
    ["8-across", "IDLESPEEDS"],
    ["10-across", "IMPEDANCES"],
    ["13-across", "TRANSFORMER"],
    ["16-across", "GAMMA"],
    ["17-across", "CYSAN"],
    ["1-down", "ASCII"],
    ["2-down", "ARC"],
    ["4-down", "ANN"],
    ["6-down", "THETA"],
    ["7-down", "EM"],
    ["9-down", "STEPS"],
    ["11-down", "SIREN"],
    ["12-down", "IT"],
    ["14-down", "ATM"],
    ["15-down", "OCC"],
  ];

  for (const [entryId, answer] of entries) {
    const inputs = entryInputs(page, entryId);
    const count = await inputs.count();

    for (let index = 0; index < count; index += 1) {
      await inputs.nth(index).fill(answer[index]);
    }
  }

  await expect(page.locator("#puzzle-status")).toHaveText(
    "Congratulations! You completed the crossword.",
  );
  await expect(page.locator("#crossword-grid")).toHaveClass(/(^|\s)is-complete(\s|$)/);
  await expect(page.locator("#puzzle-status")).toHaveClass(
    /(^|\s)puzzle-complete(\s|$)/,
  );
});
