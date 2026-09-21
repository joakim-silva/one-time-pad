"use strict";

// 1. Small helpers and the deliberately invented teaching codebook.
const $ = (id) => document.getElementById(id);
const encoder = new TextEncoder();
const alphabet = Array.from(" АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ.,!?-:;");
const usedPads = { paper: new Set(), bytes: new Set() };
let reuseExperiment = null;
const hex = (bytes) => Array.from(bytes, (n) => n.toString(16).padStart(2, "0").toUpperCase()).join(" ");
const bits = (n) => n.toString(2).padStart(8, "0");
const groups = (value) => value.match(/.{1,5}/g)?.join(" ") || "";

function requireValue(value, message) {
  if (!value.length) throw new Error(message);
  return value;
}
function digits(value) {
  const clean = value.replace(/\s/g, "");
  if (!/^[0-9]+$/.test(clean)) throw new Error("Enter digits 0–9 only. Spaces and line breaks are allowed between groups.");
  if (clean.length > 400) throw new Error("Keep this demonstration to 400 digits or fewer.");
  return clean;
}
function parseHex(value) {
  const clean = value.replace(/\s/g, "");
  if (!clean || clean.length % 2 || !/^[0-9a-f]+$/i.test(clean)) {
    throw new Error("Use complete hexadecimal byte pairs, such as D0 94. Each byte needs two hex digits; do not include 0x.");
  }
  if (clean.length > 4000) throw new Error("Keep this demonstration to 2,000 bytes or fewer.");
  return Uint8Array.from(clean.match(/../g), (pair) => parseInt(pair, 16));
}
function sameLength(a, b, unit) {
  if (a.length !== b.length) throw new Error(`The message or ciphertext has ${a.length} ${unit}, but the key has ${b.length}. Their lengths must match exactly.`);
}
function encodeRussian(text) {
  const normalized = text.normalize("NFC").toUpperCase().replace(/\r\n|\r|\n/g, " ");
  const chars = Array.from(requireValue(normalized, "Enter a message first."));
  if (chars.length > 200) throw new Error("Use up to 200 characters in the paper workshop.");
  return chars.map((char) => {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error(`“${char}” is not in the teaching codebook. Use Russian letters, spaces or . , ! ? - : ;. For other text, open UTF-8 & bits.`);
    return String(index).padStart(2, "0");
  }).join("");
}
function decodeRussian(value) {
  if (value.length % 2) throw new Error("The recovered code has an incomplete two-digit character. Check the key or choose direct digits mode.");
  return value.match(/../g).map((pair) => {
    if (Number(pair) >= alphabet.length) throw new Error(`Recovered code ${pair} is not in the teaching codebook. Check the ciphertext and pad.`);
    return alphabet[Number(pair)];
  }).join("");
}
function getPaperMessage() {
  return $("paper-format").value === "text" ? encodeRussian($("paper-message").value) : digits($("paper-message").value);
}
function xor(a, b) {
  sameLength(a, b, "bytes");
  return Uint8Array.from(a, (value, i) => value ^ b[i]);
}
function randomBytes(length) {
  if (!globalThis.crypto?.getRandomValues) throw new Error("This browser cannot generate keys here. Use a current browser or enter an example key manually.");
  return crypto.getRandomValues(new Uint8Array(length));
}
function randomDigits(length) {
  let result = "";
  while (result.length < length) {
    // Reject 250–255 so each decimal digit has exactly 25 possible byte values.
    for (const byte of randomBytes(Math.max(32, length - result.length))) {
      if (byte < 250) result += byte % 10;
      if (result.length === length) break;
    }
  }
  return result;
}
function attempt(mode, task) {
  $(mode + "-error").textContent = "";
  try { task(); } catch (error) { $(mode + "-error").textContent = error.message; }
}
function reservePad(mode, key) {
  if (usedPads[mode].has(key)) throw new Error("This exact key has already encrypted a message in this session. Generate a new one. You can still use it to decrypt the matching ciphertext.");
  usedPads[mode].add(key);
}
function saveText(filename, content) {
  const url = URL.createObjectURL(new Blob([content + "\n"], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 2. Keyboard-accessible tabs. The entire site works from local files.
const tabs = Array.from(document.querySelectorAll("[data-tab]"));
function selectTab(tab) {
  tabs.forEach((button) => {
    const active = button === tab;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    $("panel-" + button.dataset.tab).hidden = !active;
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (event) => {
    let target;
    if (event.key === "ArrowRight") target = tabs[(index + 1) % tabs.length];
    if (event.key === "ArrowLeft") target = tabs[(index + tabs.length - 1) % tabs.length];
    if (event.key === "Home") target = tabs[0];
    if (event.key === "End") target = tabs[tabs.length - 1];
    if (target) { event.preventDefault(); selectTab(target); target.focus(); }
  });
});

// 3. A shared calculation viewer. It reveals one calculation at a time.
function showWalk(mode, title, headers, rows) {
  const box = $(mode + "-walk");
  box.replaceChildren(); box.hidden = false;
  const heading = document.createElement("div"); heading.className = "walk-head";
  const titleElement = document.createElement("h3"); titleElement.textContent = title;
  const controls = document.createElement("div"); controls.className = "walk-actions";
  const next = document.createElement("button"); next.className = "secondary"; next.textContent = "Next step →";
  const all = document.createElement("button"); all.className = "text-button"; all.textContent = "Show all steps";
  controls.append(next, all); heading.append(titleElement, controls);
  const scroll = document.createElement("div"); scroll.className = "table-scroll"; scroll.tabIndex = 0;
  scroll.setAttribute("role", "region"); scroll.setAttribute("aria-label", title);
  const table = document.createElement("table");
  const thead = document.createElement("thead"); const tr = document.createElement("tr");
  headers.forEach((text) => { const th = document.createElement("th"); th.scope = "col"; th.textContent = text; tr.append(th); });
  thead.append(tr); const tbody = document.createElement("tbody"); table.append(thead, tbody); scroll.append(table);
  const status = document.createElement("p"); status.className = "hint"; status.setAttribute("aria-live", "polite");
  box.append(heading, scroll, status);
  let shown = 0;
  function reveal(count) {
    const limit = Math.min(count, rows.length);
    for (; shown < limit; shown++) {
      const row = document.createElement("tr");
      rows[shown].forEach((text) => { const td = document.createElement("td"); td.textContent = text; row.append(td); });
      tbody.append(row);
    }
    status.textContent = `${shown} of ${rows.length} calculations shown. The complete result is already displayed above.`;
    next.disabled = all.disabled = shown === rows.length;
    scroll.scrollTop = scroll.scrollHeight;
  }
  next.addEventListener("click", () => reveal(shown + 1));
  all.addEventListener("click", () => reveal(rows.length));
  reveal(1);
}

// 4. Paper-pad mode: normalize text, add or subtract each decimal digit.
alphabet.forEach((char, i) => {
  const entry = document.createElement("span");
  entry.textContent = `${char === " " ? "␣" : char} ${String(i).padStart(2, "0")}`;
  $("codebook").append(entry);
});
function updatePaperPreview() {
  try {
    const message = getPaperMessage();
    $("paper-encoded").textContent = groups(message);
    $("paper-count").textContent = `${message.length} digits → ${message.length} pad digits needed`;
  } catch (error) {
    $("paper-encoded").textContent = error.message; $("paper-count").textContent = "";
  }
}
function clearWork(mode, clearCipher = true) {
  if (clearCipher) $(mode + "-cipher").value = "";
  $(mode + "-recovered").textContent = "—";
  $(mode + "-walk").hidden = true;
  $(mode + "-error").textContent = "";
}
function generatePaper() {
  attempt("paper", () => {
    const message = getPaperMessage();
    $("paper-key").value = groups(randomDigits(message.length));
    clearWork("paper");
    $("paper-pad-status").textContent = `Fresh ${message.length}-digit training pad. Ready to encrypt once.`;
  });
}
$("paper-message").addEventListener("input", () => { clearWork("paper"); updatePaperPreview(); });
$("paper-format").addEventListener("change", () => {
  const textMode = $("paper-format").value === "text";
  $("paper-message").value = textMode ? "ПРИВЕТ, МИР!" : "12345";
  $("paper-help").textContent = textMode ? "Russian letters, spaces and . , ! ? - : ; are supported. Text becomes uppercase; line breaks become spaces. Maximum 200 characters." : "Enter up to 400 digits. Spaces and line breaks between digit groups are ignored. Leading zeros are preserved.";
  $("paper-key").value = "";
  $("paper-pad-status").textContent = "Generate a pad for this message, or enter matching digits.";
  clearWork("paper"); updatePaperPreview();
});
$("paper-key").addEventListener("input", () => {
  clearWork("paper", false);
  $("paper-pad-status").textContent = "Entered manually. Use a fresh key of exactly the right length.";
});
$("paper-cipher").addEventListener("input", () => clearWork("paper", false));
$("paper-generate").addEventListener("click", generatePaper);
$("paper-example").addEventListener("click", () => {
  $("paper-format").value = "digits";
  $("paper-format").dispatchEvent(new Event("change"));
  $("paper-key").value = "78526";
  $("paper-pad-status").textContent = "Public example: 12345 + 78526 → 80861. This pad is not secret.";
});
$("paper-encrypt").addEventListener("click", () => attempt("paper", () => {
  const message = getPaperMessage(), key = digits($("paper-key").value);
  sameLength(message, key, "digits"); reservePad("paper", key);
  const rows = [], output = Array.from(message, (digit, i) => {
    const sum = Number(digit) + Number(key[i]), encrypted = sum % 10;
    rows.push([i + 1, digit, key[i], `${digit} + ${key[i]} = ${sum}`, encrypted]);
    return encrypted;
  }).join("");
  $("paper-cipher").value = groups(output); $("paper-recovered").textContent = "—";
  $("paper-pad-status").textContent = "USED for encryption in this session. Keep it for the receiver to decrypt; generate a new pad for another message.";
  showWalk("paper", "Inside the addition", ["Digit", "Message", "Pad", "Addition", "mod 10"], rows);
}));
$("paper-decrypt").addEventListener("click", () => {
  $("paper-recovered").textContent = "—";
  attempt("paper", () => {
    const cipher = digits($("paper-cipher").value), key = digits($("paper-key").value);
    sameLength(cipher, key, "digits");
    const rows = [], output = Array.from(cipher, (digit, i) => {
      const plain = (Number(digit) - Number(key[i]) + 10) % 10;
      rows.push([i + 1, digit, key[i], `(${digit} − ${key[i]} + 10) mod 10`, plain]); return plain;
    }).join("");
    $("paper-recovered").textContent = $("paper-format").value === "text" ? decodeRussian(output) : output;
    showWalk("paper", "Undoing the addition", ["Digit", "Cipher", "Pad", "Subtraction", "Message"], rows);
  });
});
$("paper-save").addEventListener("click", () => attempt("paper", () => saveText("paper-ciphertext.txt", groups(digits($("paper-cipher").value)))));
$("paper-save-key").addEventListener("click", () => attempt("paper", () => saveText("paper-pad-key.txt", groups(digits($("paper-key").value)))));

// 5. UTF-8 mode: encode characters into bytes, then apply XOR byte by byte.
function getBytesMessage() {
  const text = requireValue($("bytes-message").value, "Enter a message first.");
  const bytes = encoder.encode(text);
  if (bytes.length > 2000) throw new Error("Keep this demonstration to 2,000 UTF-8 bytes or fewer.");
  return bytes;
}
function updateBytesPreview() {
  const text = $("bytes-message").value, bytes = encoder.encode(text);
  $("bytes-encoded").textContent = bytes.length ? hex(bytes) : "Enter text to inspect its bytes.";
  $("bytes-count").textContent = `${Array.from(text).length} code points / ${bytes.length} bytes / ${bytes.length * 8} bits`;
  $("character-rows").replaceChildren();
  for (const char of text) {
    const values = [char === " " ? "␣ (space)" : char === "\n" ? "↵ (line break)" : char,
      "U+" + char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"),
      hex(encoder.encode(char)), Array.from(encoder.encode(char), bits).join(" ")];
    const tr = document.createElement("tr");
    values.forEach((value) => { const td = document.createElement("td"); td.textContent = value; tr.append(td); });
    $("character-rows").append(tr);
  }
}
function generateBytes() {
  attempt("bytes", () => {
    const message = getBytesMessage();
    $("bytes-key").value = hex(randomBytes(message.length));
    clearWork("bytes");
    $("bytes-pad-status").textContent = `Fresh ${message.length}-byte training key. Ready to encrypt once.`;
  });
}
$("bytes-message").addEventListener("input", () => { clearWork("bytes"); updateBytesPreview(); });
$("bytes-key").addEventListener("input", () => { clearWork("bytes", false); $("bytes-pad-status").textContent = "Entered manually. Match the message byte count exactly."; });
$("bytes-cipher").addEventListener("input", () => clearWork("bytes", false));
$("bytes-generate").addEventListener("click", generateBytes);
$("bytes-example").addEventListener("click", () => { $("bytes-message").value = "Да, hello! 🌍"; updateBytesPreview(); generateBytes(); });
function byteWalk(input, key, output, decrypting) {
  const rows = Array.from(input, (byte, i) => [i + 1, hex([byte]), bits(byte), bits(key[i]), bits(output[i]), hex([output[i]])]);
  showWalk("bytes", decrypting ? "XOR reverses itself" : "Inside the XOR", ["Byte", decrypting ? "Cipher hex" : "Text hex", "Input bits", "Key bits", "XOR bits", "Output hex"], rows);
}
$("bytes-encrypt").addEventListener("click", () => attempt("bytes", () => {
  const message = getBytesMessage(), key = parseHex($("bytes-key").value);
  sameLength(message, key, "bytes"); reservePad("bytes", hex(key));
  const output = xor(message, key);
  $("bytes-cipher").value = hex(output); $("bytes-recovered").textContent = "—";
  $("bytes-pad-status").textContent = "USED for encryption in this session. Decryption is allowed; encrypt your next message with a new key.";
  byteWalk(message, key, output, false);
}));
$("bytes-decrypt").addEventListener("click", () => {
  $("bytes-recovered").textContent = "—";
  attempt("bytes", () => {
    const cipher = parseHex($("bytes-cipher").value), key = parseHex($("bytes-key").value);
    const output = xor(cipher, key);
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(output); }
    catch { throw new Error("The recovered bytes are not valid UTF-8 text. Check the key and ciphertext. A valid decoding still does not authenticate the message."); }
    $("bytes-recovered").textContent = text;
    byteWalk(cipher, key, output, true);
  });
});
$("bytes-save").addEventListener("click", () => attempt("bytes", () => saveText("utf8-ciphertext.txt", hex(parseHex($("bytes-cipher").value)))));
$("bytes-save-key").addEventListener("click", () => attempt("bytes", () => saveText("utf8-key.txt", hex(parseHex($("bytes-key").value)))));

// 6. Deliberate misuse experiment: C1 XOR C2 cancels the repeated key.
function resetReuse() {
  reuseExperiment = null;
  ["reuse-c1", "reuse-c2", "reuse-xor", "reuse-recovered"].forEach((id) => $(id).textContent = "—");
  $("reuse-reveal").disabled = true;
  $("reuse-explanation").textContent = "Run the experiment to see the ciphertexts.";
  $("reuse-error").textContent = "";
}
["reuse-a", "reuse-b"].forEach((id) => $(id).addEventListener("input", resetReuse));
$("reuse-run").addEventListener("click", () => {
  resetReuse();
  attempt("reuse", () => {
    const a = encoder.encode(requireValue($("reuse-a").value, "Enter message A."));
    const b = encoder.encode(requireValue($("reuse-b").value, "Enter message B."));
    if (a.length !== b.length) throw new Error(`A has ${a.length} bytes and B has ${b.length}. Use equal byte lengths for this experiment.`);
    const key = randomBytes(a.length), c1 = xor(a, key), c2 = xor(b, key), combined = xor(c1, c2);
    reuseExperiment = { knownA: a, combined };
    $("reuse-c1").textContent = hex(c1); $("reuse-c2").textContent = hex(c2); $("reuse-xor").textContent = hex(combined);
    $("reuse-reveal").disabled = false;
    $("reuse-explanation").textContent = "00 in the combined stream means the two original bytes match. Other values reveal differences. Now assume the attacker knows all of message A.";
  });
});
$("reuse-reveal").addEventListener("click", () => {
  if (!reuseExperiment) return;
  const recovered = xor(reuseExperiment.combined, reuseExperiment.knownA);
  $("reuse-recovered").textContent = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(recovered);
  $("reuse-explanation").textContent = "Recovered using only the two ciphertexts and known message A: (C₁ ⊕ C₂) ⊕ M₁ = M₂. The key was not needed. Knowing just part of A exposes the corresponding bytes of B.";
});

// 7. Initial state: useful examples, fresh training keys, no encrypted message yet.
updatePaperPreview(); updateBytesPreview(); generatePaper(); generateBytes();
