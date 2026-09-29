(function ($) {
  "use strict";

  // PUBLIC_INTERFACE
  /**
   * Render an interactive crossword into each selected element.
   *
   * @param {Array} entryData Puzzle entries with clue, answer, position,
   * orientation, startx, and starty properties.
   * @returns {jQuery} The original plugin collection.
   */
  $.fn.crossword = function (entryData) {
    return this.each(function () {
      var $root = $(this);
      var $clueRoot = $root.siblings("#puzzle-clues").first();
      var $status = $root.closest("main").find("#puzzle-status").first();
      var entries = [];
      var cells = {};
      var entryById = {};
      var activeEntryId;
      var activeCellKey;
      var currentDirection = "across";

      function normalizeEntries(data) {
        return $.map(data, function (raw, index) {
          var answer = String(raw.answer).toLowerCase();
          var id = "entry-" + index;
          var coordinates = [];

          $.each(answer.split(""), function (letterIndex) {
            coordinates.push({
              key: (Number(raw.startx) + (raw.orientation === "across" ? letterIndex : 0)) + "," +
                (Number(raw.starty) + (raw.orientation === "down" ? letterIndex : 0)),
              letter: answer.charAt(letterIndex)
            });
          });

          return {
            id: id,
            index: index,
            clue: raw.clue,
            answer: answer,
            position: Number(raw.position),
            orientation: raw.orientation,
            coordinates: coordinates,
            solved: false
          };
        }).sort(function (first, second) {
          if (first.position !== second.position) {
            return first.position - second.position;
          }
          return first.orientation === "across" ? -1 : 1;
        });
      }

      function buildCellMap() {
        $.each(entries, function (_, entry) {
          $.each(entry.coordinates, function (_, coordinate) {
            if (!cells[coordinate.key]) {
              cells[coordinate.key] = { key: coordinate.key, letter: coordinate.letter, entries: [] };
            }
            cells[coordinate.key].entries.push(entry.id);
          });
          entryById[entry.id] = entry;
        });
      }

      function entryInputs(entry) {
        return $root.find('input[data-entry-ids~="' + entry.id + '"]');
      }

      function cellInput(cellKey) {
        return $root.find('input[data-cell-key="' + cellKey + '"]');
      }

      function setStatus(message, isComplete) {
        $status.text(message).toggleClass("is-complete", Boolean(isComplete));
      }

      function isEntrySolved(entry) {
        var value = "";
        $.each(entry.coordinates, function (_, coordinate) {
          value += cellInput(coordinate.key).val().toLowerCase();
        });
        return value === entry.answer;
      }

      function updateSolvedStates() {
        var allSolved = true;

        $.each(entries, function (_, entry) {
          entry.solved = isEntrySolved(entry);
          entryInputs(entry).closest("td").toggleClass("entry-solved", entry.solved);
          $clueRoot.find('[data-entry-id="' + entry.id + '"]').toggleClass("is-solved", entry.solved);
          allSolved = allSolved && entry.solved;
        });

        if (allSolved) {
          setStatus("Congratulations! You completed the crossword.", true);
        } else if (activeEntryId) {
          var active = entryById[activeEntryId];
          setStatus(active.position + " " + active.orientation + ": " + active.clue, false);
        }
      }

      function activateEntry(entryId, requestedCellKey, focusInput) {
        var entry = entryById[entryId];
        var targetCellKey = requestedCellKey || entry.coordinates[0].key;

        if (!entry) {
          return;
        }

        activeEntryId = entry.id;
        currentDirection = entry.orientation;
        activeCellKey = targetCellKey;

        $root.find("td").removeClass("entry-active cell-current");
        entryInputs(entry).closest("td").addClass("entry-active");
        cellInput(targetCellKey).closest("td").addClass("cell-current");

        $clueRoot.find(".clue-button").removeClass("is-active").attr("aria-current", "false");
        $clueRoot.find('[data-entry-id="' + entry.id + '"]').addClass("is-active").attr("aria-current", "true");

        updateSolvedStates();

        if (focusInput) {
          cellInput(targetCellKey).focus().select();
        }
      }

      function entryAtCell(cellKey, direction) {
        var cell = cells[cellKey];
        var matching;

        if (!cell) {
          return null;
        }

        matching = $.grep(cell.entries, function (entryId) {
          return entryById[entryId].orientation === direction;
        });

        return matching.length ? matching[0] : null;
      }

      function moveWithinEntry(offset) {
        var entry = entryById[activeEntryId];
        var currentIndex;
        var destinationIndex;

        if (!entry) {
          return;
        }

        currentIndex = $.map(entry.coordinates, function (coordinate, index) {
          return coordinate.key === activeCellKey ? index : null;
        })[0];
        destinationIndex = Math.max(0, Math.min(entry.coordinates.length - 1, currentIndex + offset));
        activateEntry(entry.id, entry.coordinates[destinationIndex].key, true);
      }

      function cycleEntry(backwards) {
        var currentIndex = $.map(entries, function (entry, index) {
          return entry.id === activeEntryId ? index : null;
        })[0];
        var nextIndex = (currentIndex + (backwards ? -1 : 1) + entries.length) % entries.length;
        activateEntry(entries[nextIndex].id, null, true);
      }

      function renderGrid() {
        var maxX = 0;
        var maxY = 0;
        var numberByCell = {};
        var html = ['<table id="puzzle" aria-label="Crossword grid"><tbody>'];

        $.each(entries, function (_, entry) {
          var firstKey = entry.coordinates[0].key;
          if (!numberByCell[firstKey] || entry.position < numberByCell[firstKey]) {
            numberByCell[firstKey] = entry.position;
          }
          $.each(entry.coordinates, function (_, coordinate) {
            var parts = coordinate.key.split(",");
            maxX = Math.max(maxX, Number(parts[0]));
            maxY = Math.max(maxY, Number(parts[1]));
          });
        });

        for (var y = 1; y <= maxY; y += 1) {
          html.push("<tr>");
          for (var x = 1; x <= maxX; x += 1) {
            var key = x + "," + y;
            var cell = cells[key];
            if (!cell) {
              html.push('<td class="blocked" aria-hidden="true"></td>');
            } else {
              html.push('<td data-cell-key="' + key + '">');
              if (numberByCell[key]) {
                html.push('<span class="cell-number" aria-hidden="true">' + numberByCell[key] + "</span>");
              }
              html.push('<input type="text" inputmode="text" autocomplete="off" autocapitalize="characters" ' +
                'maxlength="1" aria-label="Row ' + y + ", column " + x + '" data-cell-key="' + key + '" ' +
                'data-entry-ids="' + cell.entries.join(" ") + '">');
              html.push("</td>");
            }
          }
          html.push("</tr>");
        }

        html.push("</tbody></table>");
        $root.empty().append(html.join(""));
      }

      function renderClues() {
        var groups = {
          across: $('<section class="clue-group"><h2 id="across-heading">Across</h2><ol class="clue-list" aria-labelledby="across-heading"></ol></section>'),
          down: $('<section class="clue-group"><h2 id="down-heading">Down</h2><ol class="clue-list" aria-labelledby="down-heading"></ol></section>')
        };

        $.each(entries, function (_, entry) {
          $('<li></li>').append(
            $("<button></button>", {
              type: "button",
              "class": "clue-button",
              "data-entry-id": entry.id,
              text: entry.position + ". " + entry.clue
            })
          ).appendTo(groups[entry.orientation].find("ol"));
        });

        $clueRoot.empty().append(groups.across, groups.down);
      }

      function bindEvents() {
        $root.on("click", "input", function () {
          var key = $(this).data("cell-key");
          var preferredEntry = entryAtCell(key, currentDirection);
          var cellEntries = cells[key].entries;
          var selectedEntry = preferredEntry || cellEntries[0];

          if (activeCellKey === key && cellEntries.length > 1) {
            selectedEntry = activeEntryId === cellEntries[0] ? cellEntries[1] : cellEntries[0];
          }
          activateEntry(selectedEntry, key, true);
        });

        $root.on("keydown", "input", function (event) {
          var keyCode = event.which;
          var key = $(this).data("cell-key");
          var directionEntry;

          if (keyCode === 9) {
            event.preventDefault();
            cycleEntry(event.shiftKey);
            return;
          }

          if (keyCode === 37 || keyCode === 38 || keyCode === 39 || keyCode === 40) {
            event.preventDefault();
            currentDirection = (keyCode === 37 || keyCode === 39) ? "across" : "down";
            directionEntry = entryAtCell(key, currentDirection);
            if (directionEntry) {
              activateEntry(directionEntry, key, false);
              moveWithinEntry(keyCode === 37 || keyCode === 38 ? -1 : 1);
            }
            return;
          }

          if (keyCode === 8 || keyCode === 46) {
            if (!$(this).val()) {
              event.preventDefault();
              moveWithinEntry(-1);
              if (keyCode === 8) {
                cellInput(activeCellKey).val("");
                updateSolvedStates();
              }
            }
          }
        });

        $root.on("input", "input", function () {
          var value = $(this).val().replace(/[^a-z]/gi, "").slice(-1).toUpperCase();
          $(this).val(value);

          if (!activeEntryId) {
            activateEntry(cells[$(this).data("cell-key")].entries[0], $(this).data("cell-key"), false);
          }

          updateSolvedStates();
          if (value) {
            moveWithinEntry(1);
          }
        });

        $clueRoot.on("click", ".clue-button", function () {
          activateEntry($(this).data("entry-id"), null, true);
        });
      }

      entries = normalizeEntries(entryData);
      buildCellMap();
      renderGrid();
      renderClues();
      bindEvents();
      activateEntry(entries[0].id, entries[0].coordinates[0].key, false);
    });
  };
}(jQuery));
