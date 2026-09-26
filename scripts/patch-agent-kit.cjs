// Patches for @inngest/agent-kit's Gemini adapter. Idempotent; runs on every
// install via the `postinstall` script.
//
// 1. Gemini 3 models reject function-call history that is missing a
//    `thoughtSignature` (HTTP 400), and agent-kit rebuilds that history
//    without one. Add Google's documented "skip validation" value.
// 2. Gemini rejects a request whose last turn is a model turn (HTTP 400
//    "Requests ending with a model turn are not supported"). agent-kit can
//    produce exactly that when the model answers with text and the agent
//    loop runs again. Append a short user turn in that case.
const fs = require("fs");
const path = require("path");

const dist = path.join(
  __dirname,
  "..",
  "node_modules",
  "@inngest",
  "agent-kit",
  "dist",
);

const SIGNATURE_MARKER = "skip_thought_signature_validator";
const signaturePattern =
  /(functionCall: \{\s*name: m\.tools\[0\]\.name,\s*args: m\.tools\[0\]\.input\s*\})/g;

const CONTINUE_MARKER = "monolith-continue-turn";
const contentsLine = "const contents = messages.map((m) => messageToContent(m));";
const contentsPatched = `${contentsLine}
  /* ${CONTINUE_MARKER} */
  if (contents.length > 0 && contents[contents.length - 1].role === "model") {
    contents.push({
      role: "user",
      parts: [
        {
          text: "Continue. If everything is finished, reply with the <task_summary>. Otherwise carry on and create any remaining files."
        }
      ]
    });
  }`;

if (!fs.existsSync(dist)) process.exit(0);

for (const file of fs.readdirSync(dist)) {
  if (!/\.(c?js)$/.test(file)) continue;
  const full = path.join(dist, file);
  let src = fs.readFileSync(full, "utf8");
  let changed = false;

  if (!src.includes(SIGNATURE_MARKER) && signaturePattern.test(src)) {
    signaturePattern.lastIndex = 0;
    src = src.replace(
      signaturePattern,
      `$1,\n                thoughtSignature: "${SIGNATURE_MARKER}"`,
    );
    changed = true;
  }

  if (!src.includes(CONTINUE_MARKER) && src.includes(contentsLine)) {
    src = src.replace(contentsLine, contentsPatched);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(full, src);
    console.log(`[patch-agent-kit] patched ${file}`);
  }
}
