# Slay the Spire 2 AI Agent

This project implements an AI agent that learns to play Slay the Spire 2 by using screen scraping and keyboard inputs.

## Requirements

- Python 3.x
- Slay the Spire 2 installed on Mac via Steam

## Installation

1. Install dependencies: `pip install -r requirements.txt`
2. Ensure Tesseract is installed for OCR: `brew install tesseract`

## Usage

Run the agent: `python src/main.py`

The agent will capture the screen, detect game state, decide actions, and perform keyboard inputs to play the game.

Currently, actions are random; future versions will implement learning algorithms to progress through difficulties.

## Notes

- Set the game to windowed mode and adjust `game_region` in the code to the game window coordinates.
- The agent assumes certain key mappings; adjust as needed.