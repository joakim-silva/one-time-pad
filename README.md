# One-Time Pad — Cipher Workshop

An interactive educational website exploring one-time-pad encryption through Russian text, decimal arithmetic, UTF-8 bytes, and a demonstration of key reuse.

Built with **HTML, CSS, and JavaScript**, the site runs entirely in the browser and works offline.

## Features

### Paper-Pad Workshop

* Convert Russian text into digits using a teaching codebook.
* Alternatively, enter message digits directly.
* Generate a matching pad.
* Encrypt using addition without carrying.
* Decrypt using subtraction modulo 10.
* Follow each calculation step by step.

### UTF-8 & Binary Workshop

* Explore text in different languages, including emoji.
* Inspect Unicode code points and UTF-8 bytes.
* Encrypt and decrypt using XOR.
* View hexadecimal and binary representations.

### Key-Reuse Experiment

* Encrypt two messages using the same key.
* Observe how XORing their ciphertexts cancels the shared key.
* Recover one message when the other is known.

Ciphertext and keys can also be downloaded separately.

## How It Works

In paper mode, each supported character has a two-digit teaching code. For example:

| Letter | Code |
| ------ | ---- |
| П      | 17   |
| Р      | 18   |
| И      | 10   |
| В      | 03   |
| Е      | 06   |
| Т      | 20   |

The word **ПРИВЕТ** becomes `171810030620`.

Each message digit is then combined with its matching pad digit:

```text
Message:    1 2 3 4 5
Pad:        7 8 5 2 6
Ciphertext: 8 0 8 6 1
```

Addition is performed separately in each column, keeping only the last digit.

In UTF-8 mode, text becomes bytes before encryption:

```text
Encryption: message XOR key = ciphertext
Decryption: ciphertext XOR key = message
```

## Run Locally

1. Download and extract the repository.
2. Open `index.html` in a modern browser.

Keep `index.html`, `style.css`, and `script.js` in the same folder.

No installation, server, API key, or internet connection is required for the workshops. External reference links require internet access.

## Project Files

| File         | Purpose                                                          |
| ------------ | ---------------------------------------------------------------- |
| `index.html` | Page structure, workshop controls, and historical notes          |
| `style.css`  | Styling and responsive layout                                    |
| `script.js`  | Encoding, encryption, decryption, and interactive demonstrations |

## Historical Context

The paper workshop is inspired by Soviet systems that combined numerical codebooks with one-time pads.

The **VENONA project** exploited weaknesses associated with duplicated Soviet pad material. VENONA was the American codebreaking project’s name, rather than the name of a Soviet cipher.

This site is an educational reconstruction. Its character codebook is invented, and the UTF-8 mode is a modern demonstration—not a reproduction of wartime text encoding.

## Educational Scope

A true one-time pad requires a uniformly random, independent secret key, as long as the encoded message, that is never reused.

This project generates training keys using the browser’s `crypto.getRandomValues()` function. It demonstrates the arithmetic but does not claim the perfect secrecy of a theoretical one-time pad.

The site:

* Blocks exact encryption-key reuse within each mode during the current session.
* Does not detect partial key overlap or reuse across sessions.
* Does not authenticate messages or detect tampering.
* Keeps messages and keys in page memory unless explicitly downloaded.

Refreshing the page clears the session. This is a learning tool, not a secure messaging application.

## Learning Goals

* Distinguish encoding from encryption.
* Understand modular arithmetic and XOR.
* Connect Unicode characters with their UTF-8 bytes.
* Explore why key management matters.
* Build browser interactions using JavaScript and the DOM.

## References

* [NSA — The VENONA Story](https://www.nsa.gov/Portals/70/documents/about/cryptologic-heritage/historical-figures-publications/publications/coldwar/venona_story.pdf)
* [CIA — One-Time Pads](https://www.cia.gov/legacy/museum/artifact/one-time-pads/)
* [MDN — crypto.getRandomValues()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues)
* [MDN — TextEncoder](https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder)

## Author

Joakim Silva

