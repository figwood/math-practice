# Math Practice

A simple, cute static website for kids to practice math.

## Features

- Generates 20 random questions per practice session.
- Shows one question at a time.
- Shows a red cross when the answer is wrong and asks the user to try again.
- Shows a green check when the answer is correct and moves to the next question.
- Shows a celebration animation after all questions are completed.
- Includes two question types:
  - Addition within 20
  - Subtraction within 20

The generated questions avoid `0`. Addition questions prefer carrying and results greater than 10. Subtraction questions prefer borrowing.

## Run Locally

No build step is required.

Open `index.html` directly in a browser:

```bash
open index.html
```

## Run With Docker

Build the image:

```bash
docker build -t math-practice .
```

Run the container:

```bash
docker run --rm -p 8080:8080 math-practice
```

Then open:

```text
http://localhost:8080
```

## Deploy To Cloudflare Pages

Use Cloudflare Pages with GitHub integration.

If this directory is the repository root:

- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `/`

If this directory is inside a larger repository:

- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `math-practice`

After deployment, Cloudflare Pages will automatically redeploy when changes are pushed to GitHub.

## Files

- `index.html`: page structure
- `styles.css`: cartoon UI and animations
- `script.js`: question generation and quiz logic
- `Dockerfile`: tiny BusyBox-based static server image
