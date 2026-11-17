"use strict";

const { MarkdownView, Modal, Notice, Plugin, Setting } = require("obsidian");

const fields = [
  ["question", "Research question", "Question the experiment will answer", ["question", "research questions"]],
  ["hypothesis", "Hypothesis", "Prediction and expected direction", ["hypotheses"]],
  ["conditions", "Baseline and variants", "Control, treatments, models or agent configurations", ["baseline", "control", "variants", "conditions", "comparison", "models", "agents"]],
  ["data", "Data and sample", "Dataset, sampling plan and sample size", ["data", "dataset", "datasets", "sample", "sample size"]],
  ["method", "Method", "Run protocol, repetitions and evaluation procedure", ["methodology", "experimental design", "protocol", "approach", "design", "procedure"]],
  ["metrics", "Metrics and success criteria", "Primary metric, measurement and decision threshold", ["metrics", "evaluation metrics", "success criteria", "decision rule", "measures"]],
  ["budget", "Cost and runtime", "Budget cap, actual spend and time per run", ["budget", "cost", "costs", "runtime", "latency"]],
  ["evidence", "Evidence", "Sources, run logs, notebooks or data links", ["sources", "references", "artifacts", "run logs", "supporting evidence"]],
  ["results", "Results", "Observed outcomes and uncertainty", ["findings", "observations", "outcomes"]],
  ["limitations", "Limitations", "Confounds, failure modes and open questions", ["risks", "caveats", "threats to validity", "confounds"]],
  ["next", "Next steps", "Decision, replication or follow-up", ["next step", "follow-up", "discussion and next steps"]]
];

function normalizeLabel(label) {
  return label.toLowerCase().trim().replace(/^\d+[.)]\s+/, "").replace(/[:?]+$/, "").trim();
}

const labels = new Map(fields.flatMap(([id, name, , aliases]) =>
  [name, ...aliases].map(label => [normalizeLabel(label), id])
));

function extractFields(markdown) {
  const lines = markdown.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines[0] === "---") {
    const end = lines.findIndex((line, index) => index > 0 && /^(---|\.\.\.)\s*$/.test(line));
    if (end > 0) lines.splice(0, end + 1);
  }

  const extracted = {};
  let section = null;
  let pending = null;
  let fence = null;

  function flush() {
    if (!pending) return;
    const value = pending.lines.join("\n").trim();
    if (value) extracted[pending.id] = [extracted[pending.id], value].filter(Boolean).join("\n\n");
    pending = null;
  }

  for (const line of lines) {
    const delimiter = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      pending?.lines.push(line);
      if (delimiter && delimiter[1][0] === fence[0] && delimiter[1].length >= fence.length && !delimiter[2].trim()) {
        fence = null;
      }
      continue;
    }
    if (delimiter) {
      fence = delimiter[1];
      pending?.lines.push(line);
      continue;
    }

    const heading = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      const depth = heading[1].length;
      const id = labels.get(normalizeLabel(heading[2]));
      if (id || !section || depth <= section.depth) {
        flush();
        section = id ? { id, depth } : null;
        if (section) pending = { id, lines: [] };
      } else {
        if (!pending) pending = { id: section.id, lines: [] };
        // Keep subheadings under their field in the generated record.
        pending.lines.push("### " + heading[2]);
      }
      continue;
    }

    const labeled = /^ {0,3}(?:[-*+]\s+)?(?:\*\*([^:*]+):?\*\*:?|([^:*]+):)\s*(.*)$/.exec(line);
    const label = labeled && labels.get(normalizeLabel(labeled[1] || labeled[2]));
    if (label) {
      flush();
      pending = { id: label, lines: [labeled[3]] };
    } else {
      // A separate list item ends a labeled field outside a recognized section.
      if (!section && (/^ {0,3}[-*+]\s+/.test(line) || (!line.trim() && pending?.lines.some(value => value.trim())))) flush();
      pending?.lines.push(line);
    }
  }
  flush();
  return extracted;
}

const pendingRecords = new Set();
const statuses = ["draft", "planned", "running", "completed"];

function fileStem(title) {
  const cleaned = Array.from(title.replace(/[<>:"/\\|?*#[\]\x00-\x1F\x7F]/g, " ").replace(/\s+/g, " ").trim())
    .slice(0, 60).join("").replace(/[. ]+$/, "");
  if (!cleaned) return "Experiment";
  return /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(cleaned) ? "Experiment - " + cleaned : cleaned;
}

function renderRecord({ title, status, sourceLink, values }) {
  const now = new Date();
  const date = new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const yaml = value => JSON.stringify(value);
  const sections = fields.map(([id, label]) => `## ${label}\n\n${(values[id] || "").trim()}`.trimEnd()).join("\n\n");
  const heading = title.replace(/[\\`*_{}\[\]<>#!|~&$]/g, "\\$&");
  return `---\ntype: experiment\nstatus: ${status}\ncreated: ${date}\ntitle: ${yaml(title)}\nsource: ${yaml(sourceLink)}\n---\n\n# ${heading}\n\nSource: ${sourceLink}\n\n${sections.trimEnd()}\n`;
}

async function createRecord(app, source, draft) {
  const { vault, fileManager } = app;
  if (vault.getAbstractFileByPath(source.path) !== source) {
    throw new Error("The source note is no longer in the vault.");
  }
  const directory = source.path.slice(0, source.path.lastIndexOf("/") + 1);
  const stem = fileStem(draft.title) + " - Experiment";
  for (let copy = 1; ; copy++) {
    const path = `${directory}${stem}${copy === 1 ? "" : " " + copy}.md`;
    if (pendingRecords.has(path) || vault.getAbstractFileByPath(path)) continue;
    const sourceLink = fileManager.generateMarkdownLink(source, path);
    pendingRecords.add(path);
    try {
      return await vault.create(path, renderRecord({ ...draft, sourceLink }));
    } catch (error) {
      if (!vault.getAbstractFileByPath(path)) throw error;
    } finally {
      pendingRecords.delete(path);
    }
  }
}

class ExperimentModal extends Modal {
  constructor(app, source, values) {
    super(app);
    this.source = source;
    this.draft = { title: source.basename, status: "draft", values };
  }

  onOpen() {
    this.setTitle("Create experiment record");
    this.modalEl.addClass("research-experiment-record");
    this.contentEl.createEl("p", {
      text: `From ${this.source.path}. Review the copied fields and fill in any missing details.`
    });

    let titleInput;
    new Setting(this.contentEl).setName("Experiment title").addText(input => {
      titleInput = input;
      input.inputEl.setAttribute("aria-label", "Experiment title");
      input.setValue(this.draft.title).onChange(value => { this.draft.title = value; });
    });

    new Setting(this.contentEl).setName("Status").addDropdown(input => {
      input.selectEl.setAttribute("aria-label", "Status");
      for (const status of statuses) input.addOption(status, status[0].toUpperCase() + status.slice(1));
      input.setValue(this.draft.status).onChange(value => { this.draft.status = value; });
    });

    for (const [id, label, hint] of fields) {
      new Setting(this.contentEl).setName(label).setDesc(hint).addTextArea(input => {
        input.inputEl.rows = 3;
        input.inputEl.setAttribute("aria-label", label);
        input.setValue(this.draft.values[id] || "").onChange(value => { this.draft.values[id] = value; });
      });
    }

    const error = this.contentEl.createEl("p", { cls: "research-experiment-error" });
    error.setAttribute("role", "alert");
    new Setting(this.contentEl)
      .addButton(button => button.setButtonText("Cancel").onClick(() => this.close()))
      .addButton(button => button.setButtonText("Create record").setCta().onClick(async () => {
        const title = this.draft.title.trim();
        if (!title) {
          error.setText("Enter an experiment title.");
          titleInput.inputEl.focus();
          return;
        }

        button.setDisabled(true);
        error.setText("");
        let file;
        try {
          file = await createRecord(this.app, this.source, { ...this.draft, title });
        } catch (cause) {
          error.setText(cause instanceof Error ? cause.message : String(cause));
          button.setDisabled(false);
          return;
        }

        this.close();
        try {
          await this.app.workspace.getLeaf(true).openFile(file);
        } catch (cause) {
          console.error(cause);
          new Notice(`Record saved at ${file.path}. Open it from the file explorer.`);
        }
      }));
  }

  onClose() {
    this.contentEl.empty();
  }
}

module.exports = class ResearchExperimentRecord extends Plugin {
  onload() {
    this.addCommand({
      id: "create-from-note",
      name: "Create experiment record from active note",
      checkCallback: checking => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        const source = view?.file;
        if (!source) return false;
        if (!checking) this.openExperiment(view, source);
        return true;
      }
    });
  }

  async openExperiment(view, source) {
    try {
      const markdown = view.getMode() === "source"
        ? view.editor.getValue()
        : await this.app.vault.read(source);
      new ExperimentModal(this.app, source, extractFields(markdown)).open();
    } catch (error) {
      console.error(error);
      new Notice("Could not read the active research note.");
    }
  }
};
