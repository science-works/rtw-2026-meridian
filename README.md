# Meridian

**Every case, every station, mapped live.**

Meridian is an open, AI-ready layer designed to sit alongside a histology lab's LIMS. It shows every case, block and station live, flags problems the moment they happen, estimates when each case will be ready for the pathologist, and lets any AI agent query the lab through MCP. The AI only reads and explains; scientists decide.

> ⚠️ **Simulated data.** This prototype runs on a fictional dataset built from illustrative lab timings. It is not connected to any real laboratory, and it never diagnoses, reports or predicts screening deadlines.

Built for the Science Works *Reinvent the Wheel* hackathon (London, 16–18 October 2026) by team **Block Party**.

## Run it (Node 20+)

```bash
npm install
npm run convert   # data/CellPath_Mock_Data.xlsx -> data/cellpath.json (already committed)
npm run dev       # API on http://localhost:8787, dashboard on http://localhost:5173
npm test          # acceptance tests
```

<!-- To be completed by workstream H: screenshot, architecture, setup, MCP setup, test results, Built with -->

## Licence
MIT. See [LICENSE](LICENSE).
