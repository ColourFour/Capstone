from __future__ import annotations

import base64
import json
import threading
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qs, urlparse

from automation import ScreenPoint, can_automate_mouse, is_accessibility_enabled, move_piece_drag
from board_detect import detect_board
from capture import APP_DIR, CaptureRegion, capture_fullscreen, capture_region, ensure_region, load_region, save_region
from engine import SimpleEngine
from fen import board_to_fen
from piece_classifier import PieceClassifier
from rules import BLACK, WHITE, Board, INITIAL_FEN


STATE_FILE = APP_DIR / "state.json"


class AppState:
    def __init__(self) -> None:
        self.region: Optional[CaptureRegion] = load_region()
        self.latest_capture: Optional[str] = None
        self.latest_fen: str = INITIAL_FEN
        self.message: str = "Ready."
        self.detected_moves: list[str] = []
        self.best_move: Optional[str] = None
        self.orientation: str = "white-bottom"
        self.running = False
        self.local_board: Board = Board.from_fen(INITIAL_FEN)
        self.local_running = False
        self.local_history: list[str] = []
        self.local_depth = 2
        self.lock = threading.RLock()

    def to_dict(self) -> dict:
        with self.lock:
            return {
                "region": self.region.__dict__ if self.region else None,
                "latest_capture": self.latest_capture,
                "latest_fen": self.latest_fen,
                "message": self.message,
                "legal_moves": self.detected_moves,
                "best_move": self.best_move,
                "orientation": self.orientation,
                "automation_running": self.running,
                "mouse_automation": can_automate_mouse(),
                "accessibility_enabled": is_accessibility_enabled(),
                "local_game": local_game_snapshot(self.local_board, self.local_history, self.local_depth, self.local_running),
            }

    def save(self) -> None:
        STATE_FILE.write_text(json.dumps(self.to_dict(), indent=2))


STATE = AppState()
CLASSIFIER = PieceClassifier()
ENGINE = SimpleEngine(max_depth=2)

UNICODE_PIECES = {
    "K": "♔",
    "Q": "♕",
    "R": "♖",
    "B": "♗",
    "N": "♘",
    "P": "♙",
    "k": "♚",
    "q": "♛",
    "r": "♜",
    "b": "♝",
    "n": "♞",
    "p": "♟",
}


def analyze_capture(capture_path: str, manual_fen: Optional[str] = None) -> dict:
    if not capture_path:
        raise ValueError("No capture image is available yet")
    detection = detect_board(capture_path)
    if manual_fen:
        board = Board.from_fen(manual_fen)
        classifier_message = "Used manually supplied FEN."
    else:
        classification = CLASSIFIER.classify(capture_path, detection.board_bounds)
        board_fen = board_to_fen(classification.board)
        board = Board.from_fen(f"{board_fen} w - - 0 1")
        classifier_message = classification.message

    search = ENGINE.best_move(board)
    legal_moves = [move.uci() for move in board.legal_moves()]

    with STATE.lock:
        STATE.latest_capture = capture_path
        STATE.latest_fen = board.to_fen()
        STATE.detected_moves = legal_moves
        STATE.best_move = search.move.uci() if search.move else None
        STATE.orientation = detection.orientation
        STATE.message = f"{detection.message} {classifier_message}"
        STATE.save()

    return STATE.to_dict()


def automation_loop(interval_seconds: float = 2.0) -> None:
    while True:
        with STATE.lock:
            if not STATE.running:
                return
        try:
            region = ensure_region()
            path = str(capture_region(region, APP_DIR / "auto_capture.png"))
            analyze_capture(path)
        except Exception as exc:  # pragma: no cover
            with STATE.lock:
                STATE.message = f"Automation error: {exc}"
                STATE.running = False
                STATE.save()
            return
        time.sleep(interval_seconds)


def local_game_snapshot(board: Board, history: list[str], depth: int, running: bool) -> dict:
    return {
        "fen": board.to_fen(),
        "board": render_board_state(board),
        "history": history[-30:],
        "side_to_move": board.side_to_move(),
        "status": local_game_status(board),
        "depth": depth,
        "running": running,
    }


def render_board_state(board: Board) -> list[list[dict]]:
    rendered = []
    for row in range(8):
        rendered_row = []
        for col in range(8):
            piece = board.board[row][col]
            rendered_row.append(
                {
                    "square": f"{chr(ord('a') + col)}{8 - row}",
                    "piece": piece,
                    "glyph": UNICODE_PIECES.get(piece, ""),
                    "dark": (row + col) % 2 == 1,
                }
            )
        rendered.append(rendered_row)
    return rendered


def local_game_status(board: Board) -> str:
    if board.is_checkmate():
        winner = "White" if board.winner() == WHITE else "Black"
        return f"Checkmate. {winner} wins."
    if board.is_stalemate():
        return "Stalemate."
    if board.is_draw():
        return "Draw."
    side = "White" if board.side_to_move() == WHITE else "Black"
    suffix = " in check." if board.is_in_check(board.side_to_move()) else " to move."
    return side + suffix


def play_local_engine_move() -> dict:
    with STATE.lock:
        board = STATE.local_board
        if board.is_checkmate() or board.is_draw():
            STATE.local_running = False
            STATE.message = f"Local self-play finished. {local_game_status(board)}"
            STATE.save()
            return STATE.to_dict()

        search = ENGINE.best_move(board, depth=STATE.local_depth)
        if search.move is None:
            STATE.local_running = False
            STATE.message = f"Local self-play finished. {local_game_status(board)}"
            STATE.save()
            return STATE.to_dict()

        move_text = search.move.uci()
        board.push(search.move)
        mover = "White" if board.side_to_move() == BLACK else "Black"
        STATE.local_history.append(f"{mover}: {move_text}")
        STATE.message = f"Local self-play move: {move_text}"
        if board.is_checkmate() or board.is_draw():
            STATE.local_running = False
            STATE.message = f"Local self-play finished. {local_game_status(board)}"
            STATE.best_move = None
        else:
            reply = ENGINE.best_move(board, depth=STATE.local_depth)
            STATE.best_move = reply.move.uci() if reply.move else None
        STATE.save()
        return STATE.to_dict()


def local_self_play_loop(interval_seconds: float = 0.7) -> None:
    while True:
        with STATE.lock:
            if not STATE.local_running:
                return
        play_local_engine_move()
        time.sleep(interval_seconds)


class ChessHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/":
            self._html(INDEX_HTML)
            return
        if parsed.path == "/api/state":
            self._json(STATE.to_dict())
            return
        if parsed.path == "/api/image":
            query = parse_qs(parsed.query)
            target = query.get("path", [None])[0]
            if not target:
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            path = Path(target)
            if not path.exists():
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "image/png")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.end_headers()
            self.wfile.write(path.read_bytes())
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(length) or "{}")

        try:
            if self.path == "/api/fullscreen":
                target = capture_fullscreen(APP_DIR / "fullscreen.png")
                self._json({"image": str(target)})
                return

            if self.path == "/api/region":
                region = CaptureRegion(
                    x=int(payload["x"]),
                    y=int(payload["y"]),
                    width=int(payload["width"]),
                    height=int(payload["height"]),
                )
                save_region(region)
                with STATE.lock:
                    STATE.region = region
                    STATE.message = "Saved capture region."
                    STATE.save()
                self._json(STATE.to_dict())
                return

            if self.path == "/api/capture":
                region = ensure_region()
                target = capture_region(region, APP_DIR / "latest_capture.png")
                result = analyze_capture(str(target))
                self._json(result)
                return

            if self.path == "/api/set-fen":
                fen_text = payload["fen"]
                board = Board.from_fen(fen_text)
                result = analyze_capture(STATE.latest_capture or "", manual_fen=board.to_fen())
                self._json(result)
                return

            if self.path == "/api/automation/start":
                with STATE.lock:
                    STATE.running = True
                    STATE.message = "Background automation started."
                    STATE.save()
                thread = threading.Thread(target=automation_loop, daemon=True)
                thread.start()
                self._json(STATE.to_dict())
                return

            if self.path == "/api/automation/stop":
                with STATE.lock:
                    STATE.running = False
                    STATE.message = "Background automation stopped."
                    STATE.save()
                self._json(STATE.to_dict())
                return

            if self.path == "/api/engine-move":
                move_text = payload["move"]
                self._automate_move(move_text)
                with STATE.lock:
                    STATE.message = f"Attempted automated move {move_text}."
                    STATE.save()
                self._json(STATE.to_dict())
                return

            if self.path == "/api/local/reset":
                with STATE.lock:
                    fen_text = payload.get("fen") or INITIAL_FEN
                    STATE.local_board = Board.from_fen(fen_text)
                    STATE.local_history = []
                    STATE.local_depth = int(payload.get("depth") or 2)
                    STATE.local_running = False
                    STATE.message = "Local board reset."
                    STATE.save()
                self._json(STATE.to_dict())
                return

            if self.path == "/api/local/step":
                self._json(play_local_engine_move())
                return

            if self.path == "/api/local/start":
                with STATE.lock:
                    STATE.local_depth = int(payload.get("depth") or STATE.local_depth or 2)
                    STATE.local_running = True
                    STATE.message = "Local self-play started."
                    STATE.save()
                thread = threading.Thread(target=local_self_play_loop, daemon=True)
                thread.start()
                self._json(STATE.to_dict())
                return

            if self.path == "/api/local/stop":
                with STATE.lock:
                    STATE.local_running = False
                    STATE.message = "Local self-play stopped."
                    STATE.save()
                self._json(STATE.to_dict())
                return

            if self.path == "/api/local/move":
                move_text = payload["move"]
                with STATE.lock:
                    move = STATE.local_board.find_legal_move(move_text)
                    if move is None:
                        raise ValueError(f"Illegal move: {move_text}")
                    mover = "White" if STATE.local_board.side_to_move() == WHITE else "Black"
                    STATE.local_board.push(move)
                    STATE.local_history.append(f"{mover}: {move_text}")
                    STATE.message = f"Applied local move {move_text}."
                    STATE.save()
                self._json(STATE.to_dict())
                return

        except Exception as exc:
            self._json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        self.send_error(HTTPStatus.NOT_FOUND)

    def log_message(self, format: str, *args: object) -> None:
        return

    def _automate_move(self, move_text: str) -> None:
        region = ensure_region()
        if len(move_text) < 4:
            raise ValueError("Expected a UCI move like e2e4")

        def square_center(square: str) -> ScreenPoint:
            file_index = ord(square[0]) - ord("a")
            rank_index = 8 - int(square[1])
            square_w = region.width / 8.0
            square_h = region.height / 8.0
            x = region.x + (file_index + 0.5) * square_w
            y = region.y + (rank_index + 0.5) * square_h
            return ScreenPoint(x, y)

        start = square_center(move_text[:2])
        end = square_center(move_text[2:4])
        move_piece_drag(start, end)

    def _json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _html(self, body: str) -> None:
        data = body.encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


INDEX_HTML = """<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Chess Analysis App</title>
  <style>
    :root {
      --bg: #f4efe6;
      --panel: #fffaf2;
      --ink: #1f2421;
      --accent: #8b4513;
      --board: #caa472;
    }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      background: radial-gradient(circle at top, #fff8ea 0%, var(--bg) 60%);
      color: var(--ink);
    }
    .wrap {
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px;
      display: grid;
      gap: 18px;
    }
    .panel {
      background: var(--panel);
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 18px;
      padding: 18px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
    }
    button {
      border: none;
      border-radius: 999px;
      background: var(--accent);
      color: white;
      padding: 10px 16px;
      cursor: pointer;
      margin-right: 8px;
      margin-bottom: 8px;
    }
    textarea, input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px;
      margin-top: 8px;
      border-radius: 10px;
      border: 1px solid #ccb08f;
      font-family: monospace;
    }
    img {
      max-width: 100%;
      border-radius: 12px;
    }
    .image-wrap {
      position: relative;
      display: inline-block;
      max-width: 100%;
    }
    .selection-box {
      position: absolute;
      border: 2px dashed #b22222;
      background: rgba(178, 34, 34, 0.15);
      pointer-events: none;
      display: none;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
    }
    .board-grid {
      display: grid;
      grid-template-columns: repeat(8, minmax(34px, 58px));
      border: 8px solid #6b4423;
      width: fit-content;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 12px 30px rgba(0,0,0,0.12);
    }
    .sq {
      aspect-ratio: 1 / 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 34px;
      user-select: none;
    }
    .sq.light {
      background: #f2d7ac;
    }
    .sq.dark {
      background: #b07a45;
    }
    .row {
      display: grid;
      gap: 14px;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="panel">
      <h1>Local Chess Analysis</h1>
      <p>1. Capture full screen. 2. Drag-select the chessboard rectangle in macOS screen coordinates. 3. Capture and analyze.</p>
      <button onclick="captureFullscreen()">Capture Full Screen</button>
      <button onclick="captureBoard()">Capture Region</button>
      <button onclick="startAutomation()">Start Automation</button>
      <button onclick="stopAutomation()">Stop Automation</button>
      <button onclick="playBestMove()">Play Best Move</button>
      <div id="status"></div>
    </div>

    <div class="panel">
      <h2>Region</h2>
      <p>Capture the full screen, then drag over the screenshot to select the board. You can still edit the coordinates manually if needed.</p>
      <input id="region" placeholder="x,y,width,height">
      <button onclick="saveRegion()">Save Region</button>
    </div>

    <div class="panel">
      <h2>Detected Position</h2>
      <textarea id="fen" rows="3"></textarea>
      <button onclick="setFen()">Use This FEN</button>
      <pre id="moves"></pre>
    </div>

    <div class="panel">
      <h2>Local Self-Play</h2>
      <p>Runs only inside this app. It does not control outside apps or websites.</p>
      <input id="local-depth" placeholder="search depth (default 2)" value="2">
      <button onclick="resetLocalBoard()">Reset Local Board</button>
      <button onclick="stepLocalBoard()">Play One Move</button>
      <button onclick="startLocalBoard()">Start Self-Play</button>
      <button onclick="stopLocalBoard()">Stop Self-Play</button>
      <div id="local-status"></div>
      <div id="local-board"></div>
      <pre id="local-history"></pre>
    </div>

    <div class="panel">
      <h2>Images</h2>
      <div id="images"></div>
    </div>
  </div>
  <script>
    let selectionStart = null;
    let selectionRect = null;

    async function api(path, body = {}) {
      const response = await fetch(path, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      });
      return await response.json();
    }

    async function refresh() {
      const state = await fetch('/api/state').then(r => r.json());
      render(state);
    }

    function render(state) {
      document.getElementById('status').innerText =
        `${state.message}\nBest move: ${state.best_move || 'n/a'}\nRegion: ${JSON.stringify(state.region)}\nAccessibility: ${state.accessibility_enabled ? 'enabled' : 'missing'}`;
      document.getElementById('fen').value = state.latest_fen || '';
      document.getElementById('moves').innerText =
        `Legal moves (${state.legal_moves.length}):\n${state.legal_moves.join(', ')}`;

      const stamp = Date.now();
      const images = [];
      if (state.latest_capture) {
        images.push(`<p>Latest region capture</p><img src="/api/image?path=${encodeURIComponent(state.latest_capture)}&t=${stamp}">`);
      }
      images.push(`
        <p>Latest full-screen capture</p>
        <div class="image-wrap" id="wrap">
          <img id="fullshot" src="/api/image?path=${encodeURIComponent('.app_state/fullscreen.png')}&t=${stamp}" onload="attachSelection()">
          <div class="selection-box" id="selection-box"></div>
        </div>
      `);
      document.getElementById('images').innerHTML = images.join('');
      renderLocalGame(state.local_game);
    }

    function renderLocalGame(game) {
      if (!game) return;
      document.getElementById('local-status').innerText =
        `${game.status}\nSide to move: ${game.side_to_move}\nDepth: ${game.depth}\nFEN: ${game.fen}`;
      document.getElementById('local-history').innerText = game.history.join('\n');
      const squares = [];
      for (const row of game.board) {
        for (const square of row) {
          squares.push(
            `<div class="sq ${square.dark ? 'dark' : 'light'}" title="${square.square}">${square.glyph || ''}</div>`
          );
        }
      }
      document.getElementById('local-board').innerHTML = `<div class="board-grid">${squares.join('')}</div>`;
    }

    function attachSelection() {
      const img = document.getElementById('fullshot');
      const wrap = document.getElementById('wrap');
      const box = document.getElementById('selection-box');
      if (!img || !wrap || !box || wrap.dataset.bound === 'yes') return;
      wrap.dataset.bound = 'yes';

      wrap.addEventListener('mousedown', (event) => {
        const rect = img.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
          return;
        }
        selectionStart = {x: event.clientX - rect.left, y: event.clientY - rect.top};
        selectionRect = rect;
        box.style.display = 'block';
        box.style.left = `${selectionStart.x}px`;
        box.style.top = `${selectionStart.y}px`;
        box.style.width = '0px';
        box.style.height = '0px';
      });

      wrap.addEventListener('mousemove', (event) => {
        if (!selectionStart) return;
        const currentX = event.clientX - selectionRect.left;
        const currentY = event.clientY - selectionRect.top;
        const left = Math.min(selectionStart.x, currentX);
        const top = Math.min(selectionStart.y, currentY);
        const width = Math.abs(currentX - selectionStart.x);
        const height = Math.abs(currentY - selectionStart.y);
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.width = `${width}px`;
        box.style.height = `${height}px`;
      });

      window.addEventListener('mouseup', (event) => {
        if (!selectionStart) return;
        const currentX = event.clientX - selectionRect.left;
        const currentY = event.clientY - selectionRect.top;
        const left = Math.min(selectionStart.x, currentX);
        const top = Math.min(selectionStart.y, currentY);
        const width = Math.abs(currentX - selectionStart.x);
        const height = Math.abs(currentY - selectionStart.y);
        const scaleX = img.naturalWidth / img.clientWidth;
        const scaleY = img.naturalHeight / img.clientHeight;
        const x = Math.round(left * scaleX);
        const y = Math.round(top * scaleY);
        const w = Math.round(width * scaleX);
        const h = Math.round(height * scaleY);
        document.getElementById('region').value = `${x},${y},${w},${h}`;
        selectionStart = null;
      });
    }

    async function captureFullscreen() {
      await api('/api/fullscreen');
      await refresh();
    }

    async function saveRegion() {
      const raw = document.getElementById('region').value.split(',').map(v => parseInt(v.trim(), 10));
      const [x, y, width, height] = raw;
      const state = await api('/api/region', {x, y, width, height});
      render(state);
    }

    async function captureBoard() {
      const state = await api('/api/capture');
      render(state);
    }

    async function setFen() {
      const state = await api('/api/set-fen', {fen: document.getElementById('fen').value.trim()});
      render(state);
    }

    async function startAutomation() {
      const state = await api('/api/automation/start');
      render(state);
    }

    async function stopAutomation() {
      const state = await api('/api/automation/stop');
      render(state);
    }

    async function playBestMove() {
      const state = await fetch('/api/state').then(r => r.json());
      if (!state.best_move) return;
      const next = await api('/api/engine-move', {move: state.best_move});
      render(next);
    }

    async function resetLocalBoard() {
      const depth = parseInt(document.getElementById('local-depth').value || '2', 10);
      const state = await api('/api/local/reset', {depth});
      render(state);
    }

    async function stepLocalBoard() {
      const state = await api('/api/local/step');
      render(state);
    }

    async function startLocalBoard() {
      const depth = parseInt(document.getElementById('local-depth').value || '2', 10);
      const state = await api('/api/local/start', {depth});
      render(state);
    }

    async function stopLocalBoard() {
      const state = await api('/api/local/stop');
      render(state);
    }

    refresh();
    setInterval(refresh, 3000);
  </script>
</body>
</html>
"""


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 8765), ChessHandler)
    print("Chess analysis UI running at http://127.0.0.1:8765")
    server.serve_forever()


if __name__ == "__main__":
    main()
