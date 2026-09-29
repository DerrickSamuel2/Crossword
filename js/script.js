(function ($) {
  "use strict";

  /**
   * Verify authored puzzle entries before rendering them.
   *
   * @param {Array} entries Crossword entry definitions.
   * @returns {{valid: boolean, errors: Array}} Validation outcome.
   */
  function validatePuzzle(entries) {
    var errors = [];
    var occupiedCells = {};

    if (!$.isArray(entries) || !entries.length) {
      return { valid: false, errors: ["The puzzle must contain at least one entry."] };
    }

    $.each(entries, function (index, entry) {
      var required = ["clue", "answer", "position", "orientation", "startx", "starty"];
      var answer;
      var letterIndex;

      $.each(required, function (_, property) {
        if (entry[property] === undefined || entry[property] === null || entry[property] === "") {
          errors.push("Entry " + (index + 1) + " is missing " + property + ".");
        }
      });

      if (entry.orientation !== "across" && entry.orientation !== "down") {
        errors.push("Entry " + (index + 1) + " must be across or down.");
      }

      if (!/^\d+$/.test(String(entry.position)) || Number(entry.position) < 1 ||
          !/^\d+$/.test(String(entry.startx)) || Number(entry.startx) < 1 ||
          !/^\d+$/.test(String(entry.starty)) || Number(entry.starty) < 1) {
        errors.push("Entry " + (index + 1) + " must use positive numeric coordinates and position.");
      }

      answer = String(entry.answer || "").toLowerCase();
      if (!/^[a-z]+$/.test(answer)) {
        errors.push("Entry " + (index + 1) + " must use a letters-only answer.");
        return;
      }

      for (letterIndex = 0; letterIndex < answer.length; letterIndex += 1) {
        var x = Number(entry.startx) + (entry.orientation === "across" ? letterIndex : 0);
        var y = Number(entry.starty) + (entry.orientation === "down" ? letterIndex : 0);
        var cellKey = x + "," + y;

        if (occupiedCells[cellKey] && occupiedCells[cellKey] !== answer.charAt(letterIndex)) {
          errors.push("Entry " + (index + 1) + " conflicts at coordinate " + cellKey + ".");
        }
        occupiedCells[cellKey] = answer.charAt(letterIndex);
      }
    });

    return { valid: errors.length === 0, errors: errors };
  }

  $(function () {
    var puzzleData = [
      { clue: "First letter of Greek alphabet", answer: "alpha", position: 1, orientation: "across", startx: 1, starty: 1 },
      { clue: "Not a one ___ motor, but a three ___ motor", answer: "phase", position: 3, orientation: "across", startx: 7, starty: 1 },
      { clue: "Created from a separation of charge", answer: "capacitance", position: 5, orientation: "across", startx: 1, starty: 3 },
      { clue: "The speeds of engines without an acceleration", answer: "idlespeeds", position: 8, orientation: "across", startx: 1, starty: 5 },
      { clue: "Complex resistances", answer: "impedances", position: 10, orientation: "across", startx: 2, starty: 7 },
      { clue: "This device is used to step-up, step-down, and/or isolate", answer: "transformer", position: 13, orientation: "across", startx: 1, starty: 9 },
      { clue: "Type of ray emitted from the sun", answer: "gamma", position: 16, orientation: "across", startx: 1, starty: 11 },
      { clue: "C programming language operator", answer: "cysan", position: 17, orientation: "across", startx: 7, starty: 11 },
      { clue: "Defines the alphanumeric characters typically associated with text used in programming", answer: "ascii", position: 1, orientation: "down", startx: 1, starty: 1 },
      { clue: "Generally, if you go over 1kV per cm this happens", answer: "arc", position: 2, orientation: "down", startx: 5, starty: 1 },
      { clue: "Control system strategy that tries to replicate human thought process (abbr.)", answer: "ann", position: 4, orientation: "down", startx: 9, starty: 1 },
      { clue: "Greek variable that usually describes rotor position", answer: "theta", position: 6, orientation: "down", startx: 7, starty: 3 },
      { clue: "Electromagnetic (abbr.)", answer: "em", position: 7, orientation: "down", startx: 11, starty: 3 },
      { clue: "No. 13 across does this to a voltage", answer: "steps", position: 9, orientation: "down", startx: 5, starty: 5 },
      { clue: "Emits a loud wailing sound", answer: "siren", position: 11, orientation: "down", startx: 11, starty: 7 },
      { clue: "Information technology (abbr.)", answer: "it", position: 12, orientation: "down", startx: 1, starty: 8 },
      { clue: "Asynchronous transfer mode (abbr.)", answer: "atm", position: 14, orientation: "down", startx: 3, starty: 9 },
      { clue: "Offset current control (abbr.)", answer: "occ", position: 15, orientation: "down", startx: 7, starty: 9 }
    ];
    var validation = validatePuzzle(puzzleData);
    var $status = $("#puzzle-status");

    if (!validation.valid) {
      $status.text("Puzzle setup error: " + validation.errors.join(" ")).addClass("is-error");
      if (window.console && window.console.error) {
        window.console.error("Crossword puzzle setup error:", validation.errors);
      }
      return;
    }

    $("#puzzle-wrapper").crossword(puzzleData);
  });
}(jQuery));
