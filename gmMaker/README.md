# Local Python Chess Analysis App

This project is a local macOS-friendly chess analysis app built in Python.

It includes:

- screen capture helpers for selecting and recapturing a board region
- board detection and piece-classification scaffolding using OpenCV
- a custom chess rules engine and search engine written from scratch
- a local browser UI
- unit tests for FEN handling and legal move generation

## Project Layout

- `capture.py`
- `board_detect.py`
- `piece_classifier.py`
- `fen.py`
- `rules.py`
- `engine.py`
- `ui.py`
- `tests/`

## Notes

- The chess core and UI run with the Python standard library.
- Vision modules are written to prefer `opencv-python` and `numpy`.
- On a clean machine, install dependencies from `requirements.txt` for board recognition.
- macOS Accessibility permission is required if you use move automation.

## Install

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
python3 ui.py
```

Then open the printed local URL in your browser.

## Tests

```bash
python3 -m unittest discover -s tests -v
```
