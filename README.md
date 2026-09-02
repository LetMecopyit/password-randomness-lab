# Password Randomness Lab

An interactive browser experiment demonstrating modulo bias and rejection sampling in random character generation.

## What is this?

**Can a password generator use cryptographically secure random numbers and still introduce bias?**

This experiment answers that question by letting you run real simulations and compare two character-selection methods:

- **Modulo Mapping** — `randomByte % poolSize` — simple, common, and potentially biased
- **Rejection Sampling** — discards out-of-range values to guarantee uniform distribution

## Live Demo

**[Try it →](https://letmecopyit.github.io/password-randomness-lab/)**

## How it works

When a random byte (0–255) is mapped to a character pool using the modulo operator, bias occurs if 256 is not evenly divisible by the pool size. For example, with a pool of 7 characters:

```
256 ÷ 7 = 36 remainder 4

Characters 0–3: 37 byte values each → 14.45% probability
Characters 4–6: 36 byte values each → 14.06% probability

Expected uniform: 14.29%
```

Rejection sampling eliminates this by defining a maximum valid range (`256 - (256 % poolSize)`) and discarding byte values above it. Every accepted value maps to each character with exactly equal probability.

## Features

- Choose from preset character pools (7, 10, 26, 52, 62, 71 characters) or define your own
- Run simulations with 1,000 to 1,000,000 samples
- Compare side-by-side distribution charts with chi-squared statistics
- Interactive trust challenge: can you tell which password was generated with bias?
- Runs entirely in the browser using the Web Crypto API
- No external dependencies

## Run locally

```
git clone https://github.com/LetMecopyit/password-randomness-lab.git
```

Open `index.html` in any modern browser. No build step or server required.

## Tech Stack

- Pure HTML, CSS, JavaScript (ES modules)
- Web Crypto API (`crypto.getRandomValues()`)
- No frameworks, no dependencies

## Project Structure

```
password-randomness-lab/
├── index.html              # Main page
├── styles.css              # GitHub-inspired dark theme
├── app.js                  # Application controller
├── modules/
│   ├── crypto-random.js    # Web Crypto API wrapper
│   ├── modulo-mapping.js   # Biased character selection
│   ├── rejection-sampling.js # Unbiased character selection
│   ├── simulation.js       # Experiment orchestrator
│   └── statistics.js       # Chi-squared and deviation analysis
├── README.md
└── LICENSE
```

## License

[MIT](LICENSE)
