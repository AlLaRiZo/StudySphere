/* ==========================================================
   STUDYSPHERE DATA BACKUP & RESTORE
   ========================================================== */

document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const BACKUP_VERSION = 1;
  const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
  const STORAGE_PREFIX = "studysphere_";

  // Find the dashboard.
  const dashboard =
    document.querySelector(".page#dashboard") ||
    document.querySelector(".page.active-page") ||
    document.querySelector(".page");

  if (
    !dashboard ||
    document.getElementById("studySphereBackupCard")
  ) {
    return;
  }

  // Create the backup card.
  const card = document.createElement("section");

  card.id = "studySphereBackupCard";
  card.className = "backup-card";

  card.style.cssText = `
    margin: 24px 0;
    padding: 20px;
    border: 1px solid var(--border-color, #dce7df);
    border-radius: 16px;
    background: var(--card-bg, #ffffff);
    color: var(--text-color, #203128);
  `;

  const heading = document.createElement("h2");
  heading.textContent = "Data Backup & Restore";

  const description = document.createElement("p");

  description.textContent =
    "Download a backup of your StudySphere data or restore a previous backup. Importing replaces the StudySphere data currently saved in this browser.";

  const actions = document.createElement("div");

  actions.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  `;

  // Export button.
  const exportButton = document.createElement("button");

  exportButton.type = "button";
  exportButton.textContent = "Export My Data";

  exportButton.style.cssText = `
    min-height: 44px;
    padding: 10px 16px;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    background: var(--primary, #287a50);
    color: white;
    font: inherit;
    font-weight: 600;
  `;

  // Import button.
  const importButton = document.createElement("button");

  importButton.type = "button";
  importButton.textContent = "Import Backup";

  importButton.style.cssText = `
    min-height: 44px;
    padding: 10px 16px;
    border: 1px solid var(--primary, #287a50);
    border-radius: 10px;
    cursor: pointer;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 600;
  `;

  // Hidden file input.
  const fileInput = document.createElement("input");

  fileInput.type = "file";
  fileInput.accept = ".json,application/json";
  fileInput.hidden = true;

  fileInput.setAttribute(
    "aria-label",
    "Choose a StudySphere backup file"
  );

  // Status message.
  const status = document.createElement("p");

  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  status.style.cssText = `
    margin-top: 12px;
    overflow-wrap: anywhere;
  `;

  actions.append(
    exportButton,
    importButton,
    fileInput
  );

  card.append(
    heading,
    description,
    actions,
    status
  );

  dashboard.appendChild(card);

  // Display messages.
  function setStatus(message, isError = false) {
    status.textContent = message;

    status.style.color = isError
      ? "#b42318"
      : "var(--text-color, #203128)";
  }

  // Collect StudySphere data.
  function getStudySphereData() {
    const data = {};

    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);

      if (
        !key ||
        !key.startsWith(STORAGE_PREFIX)
      ) {
        continue;
      }

      const value = localStorage.getItem(key);

      if (value === null) {
        continue;
      }

      try {
        data[key] = JSON.parse(value);
      } catch (error) {
        data[key] = value;
      }
    }

    return data;
  }

  // EXPORT DATA.
  exportButton.addEventListener("click", function () {
    try {
      const backup = {
        app: "StudySphere",
        backupVersion: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: getStudySphereData()
      };

      const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      const date = new Date()
        .toISOString()
        .slice(0, 10);

      link.href = url;

      link.download =
        "studysphere-backup-" + date + ".json";

      document.body.appendChild(link);

      link.click();
      link.remove();

      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);

      setStatus(
        "Backup exported successfully! Keep the JSON file somewhere safe."
      );

    } catch (error) {
      console.error(
        "StudySphere backup export failed:",
        error
      );

      setStatus(
        "Unable to export your data. Please check your browser and try again.",
        true
      );
    }
  });

  // OPEN FILE PICKER.
  importButton.addEventListener("click", function () {
    fileInput.value = "";
    fileInput.click();
  });

  // IMPORT DATA.
  fileInput.addEventListener("change", async function () {
    const file = fileInput.files && fileInput.files[0];

    if (!file) {
      return;
    }

    if (file.size > MAX_BACKUP_BYTES) {
      setStatus(
        "The backup file is larger than 5 MB.",
        true
      );

      return;
    }

    let backup;

    try {
      backup = JSON.parse(await file.text());

    } catch (error) {
      setStatus(
        "Invalid JSON file. Please choose a StudySphere backup.",
        true
      );

      return;
    }

    // Validate backup format.
    if (
      !backup ||
      backup.app !== "StudySphere" ||
      backup.backupVersion !== BACKUP_VERSION ||
      !backup.data ||
      typeof backup.data !== "object" ||
      Array.isArray(backup.data)
    ) {
      setStatus(
        "This is not a supported StudySphere backup.",
        true
      );

      return;
    }

    const entries = Object.entries(backup.data);

    // Only allow StudySphere storage keys.
    if (
      entries.some(function (entry) {
        return (
          typeof entry[0] !== "string" ||
          !entry[0].startsWith(STORAGE_PREFIX) ||
          entry[0].length > 200
        );
      })
    ) {
      setStatus(
        "The backup contains unsupported data keys.",
        true
      );

      return;
    }

    // Confirm before replacing saved data.
    const confirmed = window.confirm(
      "Import this backup? This will replace the StudySphere data currently saved in this browser. Export your current data first if you want to keep it."
    );

    if (!confirmed) {
      setStatus(
        "Import cancelled. Your current data has not been changed."
      );

      return;
    }

    // Prepare the backup before changing storage.
    let serializedEntries;

    try {
      serializedEntries = entries.map(function (entry) {
        const value =
          typeof entry[1] === "string"
            ? entry[1]
            : JSON.stringify(entry[1]);

        if (value === undefined) {
          throw new Error("Invalid backup value");
        }

        return [entry[0], value];
      });

    } catch (error) {
      setStatus(
        "The backup contains invalid data.",
        true
      );

      return;
    }

    // Save the current data so we can attempt a rollback.
    const previous = {};

    try {
      for (
        let index = 0;
        index < localStorage.length;
        index++
      ) {
        const key = localStorage.key(index);

        if (
          key &&
          key.startsWith(STORAGE_PREFIX)
        ) {
          previous[key] = localStorage.getItem(key);
        }
      }

      // Replace existing StudySphere data.
      Object.keys(previous).forEach(function (key) {
        localStorage.removeItem(key);
      });

      serializedEntries.forEach(function (entry) {
        localStorage.setItem(entry[0], entry[1]);
      });

      setStatus(
        "Backup imported successfully! Reloading StudySphere..."
      );

      window.setTimeout(function () {
        window.location.reload();
      }, 700);

    } catch (error) {
      // Attempt to restore the previous data.
      try {
        for (
          let index = localStorage.length - 1;
          index >= 0;
          index--
        ) {
          const key = localStorage.key(index);

          if (
            key &&
            key.startsWith(STORAGE_PREFIX)
          ) {
            localStorage.removeItem(key);
          }
        }

        Object.keys(previous).forEach(function (key) {
          if (previous[key] !== null) {
            localStorage.setItem(key, previous[key]);
          }
        });

      } catch (rollbackError) {
        console.error(
          "StudySphere rollback failed:",
          rollbackError
        );
      }

      console.error(
        "StudySphere import failed:",
        error
      );

      setStatus(
        "Import failed. Browser storage may be full or unavailable. Previous data restoration was attempted.",
        true
      );
    }
  });
});
