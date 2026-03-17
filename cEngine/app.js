import {
  newGameState,
  legalMovesFrom,
  applyUiMove,
  undo,
  pieceToChar,
  coordsToSquare,
  gameStatus,
  pickOneLegalMove,
  WHITE,
  BLACK
} from "./engine.js";

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const movesEl = document.getElementById("moves");
const cpuMoveEl = document.getElementById("cpuMove");

const newGameBtn = document.getElementById("newGameBtn");
const flipBtn = document.getElementById("flipBtn");
const undoBtn = document.getElementById("undoBtn");
const youColorSel = document.getElementById("youColor");
const autoCpuChk = document.getElementById("autoCpu");

let state = newGameState();
let flipped = false;

let youColor = "w";
let youSide = WHITE;
let cpuSide = BLACK;

let selected = null;          // {r,c}
let legalFromSelected = [];   // legal moves for that piece only
const moveLog = [];

const cells = []; // 64 elements: {el, r, c}

// Cached status so render() is cheap
let statusCache = { over: false, inCheck: false, text: "" };

function sideOfPiece(p){
  return p > 0 ? WHITE : p < 0 ? BLACK : 0;
}

function buildBoardOnce(){
  boardEl.innerHTML = "";
  for(let i=0;i<64;i++){
    const d = document.createElement("div");
    d.className = "sq";
    boardEl.appendChild(d);
    cells.push({el:d, r:0, c:0});
  }
  boardEl.addEventListener("click", onBoardClick);
}

function moveLogToText(){
  let out = "";
  for(let i=0;i<moveLog.length;i++){
    if(i%2===0) out += `${Math.floor(i/2)+1}. `;
    out += moveLog[i] + (i%2===0 ? " " : "\n");
  }
  return out || "No moves yet.";
}

function clearSelection(){
  selected = null;
  legalFromSelected = [];
}

function recomputeStatus(){
  const gs = gameStatus(state);
  statusCache.over = gs.over;
  statusCache.inCheck = !!gs.inCheck;

  if(gs.over){
    statusCache.text = gs.result;
    return;
  }

  const turnName = (state.turn === WHITE) ? "White" : "Black";
  const who = (state.turn === youSide) ? "Your turn" : "CPU turn";
  const checkTxt = gs.inCheck ? " (check)" : "";
  statusCache.text = `${who} — Turn: ${turnName}${checkTxt} — You: ${youSide===WHITE?"White":"Black"} | CPU: ${cpuSide===WHITE?"White":"Black"}`;
}

function render(){
  const rList = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
  const cList = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

  let idxCell = 0;
  for(const r of rList){
    for(const c of cList){
      const cell = cells[idxCell++];
      cell.r = r; cell.c = c;

      const el = cell.el;
      el.className = "sq " + (((r+c)%2===0) ? "light" : "dark");
      el.dataset.r = String(r);
      el.dataset.c = String(c);

      const p = state.board[(r << 3) | c];
      el.textContent = pieceToChar(p);

      if(selected && selected.r===r && selected.c===c){
        el.classList.add("selected");
      }

      if(selected && state.turn===youSide){
        const hit = legalFromSelected.find(m => m.to.r===r && m.to.c===c);
        if(hit){
          el.classList.add("hint");
          if(state.board[(r<<3)|c] !== 0) el.classList.add("capture");
        }
      }
    }
  }

  statusEl.textContent = statusCache.text;
  movesEl.textContent = moveLogToText();
}

function onBoardClick(e){
  const sq = e.target.closest(".sq");
  if(!sq) return;

  if(statusCache.over) return;
  if(state.turn !== youSide) return;

  const r = parseInt(sq.dataset.r,10);
  const c = parseInt(sq.dataset.c,10);
  const p = state.board[(r<<3)|c];

  if(!selected){
    if(p !== 0 && sideOfPiece(p) === state.turn){
      selected = {r,c};
      legalFromSelected = legalMovesFrom(state, r, c);
      render();
    }
    return;
  }

  // deselect
  if(selected.r===r && selected.c===c){
    clearSelection();
    render();
    return;
  }

  // reselect another own piece
  if(p !== 0 && sideOfPiece(p) === state.turn){
    selected = {r,c};
    legalFromSelected = legalMovesFrom(state, r, c);
    render();
    return;
  }

  // attempt move
  const move = legalFromSelected.find(m => m.to.r===r && m.to.c===c);
  if(!move) return;

  state = applyUiMove(state, move);
  moveLog.push(state.lastMoveSAN);
  clearSelection();

  recomputeStatus();
  render();

  maybeCpuMove();
}

function maybeCpuMove(){
  if(!autoCpuChk.checked) return;
  if(statusCache.over) return;
  if(state.turn !== cpuSide) return;

  requestAnimationFrame(() => {
    if(statusCache.over) return;
    if(state.turn !== cpuSide) return;

    const m = pickOneLegalMove(state);
    if(!m){
      recomputeStatus();
      render();
      return;
    }

    const from = coordsToSquare(m.from.r, m.from.c);
    const to = coordsToSquare(m.to.r, m.to.c);
    const extra = m.isCastle ? " (castle)" : m.isEP ? " (en passant)" : m.isPromo ? " (=Q)" : "";
    cpuMoveEl.textContent = `${from}→${to}${extra}`;

    state = applyUiMove(state, m);
    moveLog.push(state.lastMoveSAN);

    recomputeStatus();
    render();
  });
}

function startNewGame(){
  state = newGameState();
  moveLog.length = 0;
  cpuMoveEl.textContent = "(none yet)";
  clearSelection();

  youColor = youColorSel.value;
  youSide = (youColor === "w") ? WHITE : BLACK;
  cpuSide = -youSide;

  recomputeStatus();
  render();

  // if you chose Black, CPU starts
  maybeCpuMove();
}

newGameBtn.addEventListener("click", startNewGame);

flipBtn.addEventListener("click", () => {
  flipped = !flipped;
  render();
});

undoBtn.addEventListener("click", () => {
  // undo two plies if possible
  if(state.history.length >= 1){ state = undo(state); moveLog.pop(); }
  if(state.history.length >= 1){ state = undo(state); moveLog.pop(); }

  cpuMoveEl.textContent = "(none yet)";
  clearSelection();

  recomputeStatus();
  render();
});

autoCpuChk.addEventListener("change", () => {
  maybeCpuMove();
});

buildBoardOnce();
startNewGame();