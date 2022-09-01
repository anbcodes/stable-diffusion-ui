import express from "express";
import Database from "better-sqlite3";
import fileUpload from "express-fileupload";
import fs from "fs/promises";
import { join } from "path";
import cors from "cors";

const valid_tokens = [
  "testing-token",
];

const valid_upload_tokens = [
  "testing-upload-token",
];

const db = new Database("data.db");

db.prepare(`CREATE TABLE IF NOT EXISTS prompts(
  id INTEGER PRIMARY KEY ASC,
  prompt_text TEXT NOT NULL,
  iterations INTEGER NOT NULL,
  seed INTEGER NOT NULL,
  author TEXT NOT NULL,
  priority INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  generated BOOL DEFAULT FALSE,
  being_generated BOOL DEFAULT FALSE,
  generated_percent INTEGER DEFAULT 0
)`).run();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload());
app.use("/images", express.static("generated_images"));

app.get("/prompt/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM prompts WHERE id = ?").get(
    req.params.id,
  );
  if (!row) {
    res.status(404).send({ error: "Not Found" });
  } else {
    res.send(row);
  }
});

app.get("/prompts", (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM prompts ORDER BY generated ASC, being_generated ASC, created_at DESC",
  )
    .all();
  res.send(rows);
});

const isValidCreatePromptRequest = (req: (typeof app["request"])) =>
  typeof req.body.prompt_text === "string" &&
  req.body.prompt_text.length > 0 &&
  typeof req.body.iterations === "number" &&
  req.body.iterations > 0 &&
  typeof req.body.priority === "number" &&
  typeof req.body.seed === "number" &&
  typeof req.body.author === "string" &&
  req.body.author.length > 0;

app.post("/prompt", async (req, res) => {
  console.log(
    req.query,
    req.body,
    valid_tokens.includes(req.query.token as string),
    isValidCreatePromptRequest(req),
  );
  if (
    valid_tokens.includes(req.query.token as string) &&
    isValidCreatePromptRequest(req)
  ) {
    const rowId = db.prepare(
      "INSERT INTO prompts(prompt_text, iterations, seed, author, priority, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?)",
    ).run(
      req.body.prompt_text,
      req.body.iterations,
      req.body.seed,
      req.body.author,
      req.body.priority,
      +new Date(),
      +new Date(),
    ).lastInsertRowid;

    res.send({ id: rowId });
  } else {
    res.status(400).send({ error: "Bad request" });
  }
});

app.delete("/prompt/:id", (req, res) => {
  if (
    valid_tokens.includes(req.query.token as string)
  ) {
    db.prepare(
      "DELETE FROM prompts WHERE id = ?",
    ).run(
      req.params.id,
    );

    res.send({ success: true });
  } else {
    res.status(400).send({ error: "Bad request" });
  }
});

app.post("/upload/:id", async (req, res) => {
  if (valid_upload_tokens.includes(req.query.token as string)) {
    const row = db.prepare("SELECT * FROM prompts WHERE id = ?").get(
      req.params.id,
    );
    if (!row) {
      res.status(404).send({ error: "Prompt not found" });
      return;
    }
    const file = req.files?.result;
    if (!file || file instanceof Array) {
      res.status(400).send({ error: "Result field is required to be a file" });
      return;
    }

    await fs.mkdir("generated_images", { recursive: true });

    await fs.writeFile(
      join("generated_images", `${req.params.id}.png`),
      file.data,
    );

    db.prepare(
      "UPDATE prompts SET generated = true, being_generated = false WHERE id = ?",
    ).run(
      req.params.id,
    );
    res.send({ success: true });
  } else {
    res.status(400).send({ error: "Invalid Token" });
  }
});

app.put("/prompt/:id", (req, res) => {
  if (
    valid_upload_tokens.includes(req.query.token as string) &&
    typeof req.body.being_generated === "boolean" &&
    typeof req.body.generated_percent === "number"
  ) {
    db.prepare(
      "UPDATE prompts SET being_generated = ?, generated_percent = ?, updated_at = ? WHERE id = ?",
    ).run(
      +req.body.being_generated,
      req.body.generated_percent,
      +(new Date()),
      req.params.id,
    );
    res.send({ success: true });
  } else {
    res.status(400).send({ error: "Bad request" });
  }
});

app.get("/next_prompt", (req, res) => {
  if (valid_upload_tokens.includes(req.query.token as string)) {
    const prompt = db.prepare(
      "SELECT * FROM prompts WHERE being_generated = false AND generated = false ORDER BY priority DESC, created_at ASC LIMIT 1",
    ).get();
    if (!prompt) {
      res.status(404).send({ error: "Not Found" });
    }
    res.send(prompt);
  } else {
    res.status(400).send({ error: "Invalid token" });
  }
});

setInterval(() => {
  let lastValid = +new Date() - 1000 * 20;
  db.prepare(
    "UPDATE prompts SET being_generated = FALSE WHERE being_generated = TRUE AND updated_at < ?",
  ).run(lastValid);
}, 1000);

app.listen(5000, () => {
  console.log("Listening on http://localhost:5000");
});
