# Research Experiment Record for Obsidian

Turn an open research note into a structured Markdown experiment record. The plugin runs locally and has no account, API key, or network dependency.

## Install

1. Extract the ZIP. Copy the entire `research-experiment-record` folder into `<your vault>/.obsidian/plugins/`. If you use a custom Obsidian configuration folder, use its `plugins/` directory instead.
2. Restart Obsidian. In **Settings → Community plugins**, enable community plugins if required and turn on **Research Experiment Record**.
3. Open a research note. In the command palette, run **Research Experiment Record: Create experiment record from active note**.
4. Review the fields and choose **Create record**. The linked note opens in a new tab in the same folder as the source, so relative evidence links can still resolve. Repeating the command creates a new file with a numeric suffix if needed.

## Try it

Copy `example-research-note.md` anywhere in your vault, open it, and run the command. The draft should contain the hypothesis, evaluated variants, dataset, procedure, metrics, budget, and evidence. Results and limitations are blank for later entry.

The form copies text under recognized Markdown headings and from labels such as `Hypothesis: ...` or `- **Budget:** ...`. Matching is case-insensitive. Source text elsewhere stays accessible through the source link. If your note is freeform, enter the relevant details in the form. The plugin does not infer a hypothesis, write results, or reinterpret a source.

Every record is ordinary Markdown with Obsidian properties for type, status, creation date, title, and source. The original note is not edited. Edit the record and its properties directly as the study progresses.

The source is in [`src/main.js`](src/main.js). Run `npm run build` to copy it to the installable `main.js` at the plugin root.

[Source and other plugins](https://github.com/HackrLife/Obsidian-PlugIns/tree/main/plugins/research-experiment-record) · [Release downloads](https://github.com/HackrLife/research-experiment-record/releases)

Licensed under the [MIT License](LICENSE).
