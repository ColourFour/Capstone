// engine.js
// High-performance local chess core (no external deps)
// - Board: Int8Array(64) piece codes (0 empty, 1..6 white, -1..-6 black)
// - Make/Unmake with compact undo stack (no cloning)
// - Cached king squares, castling bitmask, ep square index
// - Precomputed knight/king moves and sliding rays
// - Legal move checking via temporary make/unmake + king-in-check test
// - Fast game status via early-exit (find any legal move)
// - FEN parse/emit for debugging

// Piece codes
const EMPTY = 0;
const WP = 1, WN = 2, WB = 3, WR = 4, WQ = 5, WK = 6;
const BP = -1, BN = -2, BB = -3, BR = -4, BQ = -5, BK = -6;

// Sides
export const WHITE = 1;
export const BLACK = -1;

// Castling rights bitmask
const CWK = 1; // white O-O
const CWQ = 2; // white O-O-O
const CBK = 4; // black O-O
const CBQ = 8; // black O-O-O

// Move flags
const F_CAPTURE = 1 << 0;
const F_EP      = 1 << 1;
const F_CASTLE  = 1 << 2;
const F_PROMO   = 1 << 3;
const F_PAWN2   = 1 << 4;

// Unicode pieces
const UNICODE = {
  [WP]:"♙", [WN]:"♘", [WB]:"♗", [WR]:"♖", [WQ]:"♕", [WK]:"♔",
  [BP]:"♟", [BN]:"♞", [BB]:"♝", [BR]:"♜", [BQ]:"♛", [BK]:"♚"
};

// FEN maps
const FEN_TO_PIECE = {
  p: BP, n: BN, b: BB, r: BR, q: BQ, k: BK,
  P: WP, N: WN, B: WB, R: WR, Q: WQ, K: WK
};
const PIECE_TO_FEN = {
  [WP]:"P", [WN]:"N", [WB]:"B", [WR]:"R", [WQ]:"Q", [WK]:"K",
  [BP]:"p", [BN]:"n", [BB]:"b", [BR]:"r", [BQ]:"q", [BK]:"k"
};

const FILES = "abcdefgh";

function idx(r, c) { return (r << 3) | c; }
function rOf(i) { return i >> 3; }
function cOf(i) { return i & 7; }

export function coordsToSquare(r, c) {
  return FILES[c] + (8 - r);
}

export function squareToCoords(sq) {
  const c = FILES.indexOf(sq[0]);
  const r = 8 - (sq.charCodeAt(1) - 48);
  return { r, c };
}

export function pieceToChar(code) {
  return UNICODE[code] ?? "";
}

function sideOf(piece) {
  return piece > 0 ? WHITE : piece < 0 ? BLACK : 0;
}

function abs(piece) {
  return piece < 0 ? -piece : piece;
}

function isBishopLike(a) { return a === 3 || a === 5; }
function isRookLike(a)   { return a === 4 || a === 5; }

// Precomputed move tables
const KNIGHT_MOVES = Array.from({ length: 64 }, () => []);
const KING_MOVES = Array.from({ length: 64 }, () => []);
const RAYS = Array.from({ length: 64 }, () => Array.from({ length: 8 }, () => []));
// 0 N,1 S,2 W,3 E,4 NW,5 NE,6 SW,7 SE
const DIRS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1]
];

(function initTables() {
  const knightD = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const s = idx(r, c);
      for (const [dr, dc] of knightD) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) KNIGHT_MOVES[s].push(idx(rr, cc));
      }
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) KING_MOVES[s].push(idx(rr, cc));
        }
      }
      for (let d = 0; d < 8; d++) {
        const [dr, dc] = DIRS[d];
        let rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          RAYS[s][d].push(idx(rr, cc));
          rr += dr; cc += dc;
        }
      }
    }
  }
})();

function findKings(board) {
  let wK = -1, bK = -1;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p === WK) wK = i;
    else if (p === BK) bK = i;
  }
  return { wK, bK };
}

export function fromFEN(fen) {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) throw new Error("Invalid FEN");

  const board = new Int8Array(64);
  board.fill(EMPTY);

  const ranks = parts[0].split("/");
  if (ranks.length !== 8) throw new Error("Invalid FEN board");

  for (let r = 0; r < 8; r++) {
    let c = 0;
    const row = ranks[r];
    for (let k = 0; k < row.length; k++) {
      const ch = row[k];
      if (ch >= "1" && ch <= "8") {
        c += ch.charCodeAt(0) - 48;
      } else {
        const p = FEN_TO_PIECE[ch];
        if (p == null) throw new Error("Invalid FEN piece");
        board[idx(r, c)] = p;
        c++;
      }
    }
    if (c !== 8) throw new Error("Invalid FEN rank width");
  }

  const turn = parts[1] === "w" ? WHITE : BLACK;

  let castling = 0;
  const cst = parts[2];
  if (cst.includes("K")) castling |= CWK;
  if (cst.includes("Q")) castling |= CWQ;
  if (cst.includes("k")) castling |= CBK;
  if (cst.includes("q")) castling |= CBQ;

  let ep = -1;
  if (parts[3] !== "-") {
    const file = FILES.indexOf(parts[3][0]);
    const rank = parts[3].charCodeAt(1) - 48;
    const rr = 8 - rank;
    ep = idx(rr, file);
  }

  const halfmove = parts[4] ? parseInt(parts[4], 10) : 0;
  const fullmove = parts[5] ? parseInt(parts[5], 10) : 1;

  const kings = findKings(board);

  return {
    board,
    turn,
    castling,
    ep,
    halfmove,
    fullmove,
    wKing: kings.wK,
    bKing: kings.bK,
    history: [],
    lastMoveSAN: null
  };
}

export function toFEN(state) {
  let s = "";
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = state.board[idx(r, c)];
      if (p === EMPTY) {
        empty++;
      } else {
        if (empty) { s += String(empty); empty = 0; }
        s += PIECE_TO_FEN[p];
      }
    }
    if (empty) s += String(empty);
    if (r !== 7) s += "/";
  }

  s += " ";
  s += (state.turn === WHITE ? "w" : "b");
  s += " ";

  let cst = "";
  if (state.castling & CWK) cst += "K";
  if (state.castling & CWQ) cst += "Q";
  if (state.castling & CBK) cst += "k";
  if (state.castling & CBQ) cst += "q";
  s += (cst || "-");

  s += " ";
  s += (state.ep === -1 ? "-" : coordsToSquare(rOf(state.ep), cOf(state.ep)));

  s += " ";
  s += String(state.halfmove | 0);
  s += " ";
  s += String(state.fullmove | 0);

  return s;
}

export function newGameState() {
  return fromFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
}

// Is square attacked by side `by`?
function isSquareAttacked(state, sq, by) {
  const b = state.board;
  const r = rOf(sq), c = cOf(sq);

  // pawns
  if (by === WHITE) {
    const rr = r + 1;
    if (rr < 8) {
      if (c > 0 && b[idx(rr, c - 1)] === WP) return true;
      if (c < 7 && b[idx(rr, c + 1)] === WP) return true;
    }
  } else {
    const rr = r - 1;
    if (rr >= 0) {
      if (c > 0 && b[idx(rr, c - 1)] === BP) return true;
      if (c < 7 && b[idx(rr, c + 1)] === BP) return true;
    }
  }

  // knights
  for (const t of KNIGHT_MOVES[sq]) {
    const p = b[t];
    if (p !== EMPTY && sideOf(p) === by && abs(p) === 2) return true;
  }

  // kings
  for (const t of KING_MOVES[sq]) {
    const p = b[t];
    if (p !== EMPTY && sideOf(p) === by && abs(p) === 6) return true;
  }

  // rook/queen rays
  for (let d = 0; d < 4; d++) {
    const ray = RAYS[sq][d];
    for (let i = 0; i < ray.length; i++) {
      const t = ray[i];
      const p = b[t];
      if (p === EMPTY) continue;
      if (sideOf(p) === by && isRookLike(abs(p))) return true;
      break;
    }
  }

  // bishop/queen rays
  for (let d = 4; d < 8; d++) {
    const ray = RAYS[sq][d];
    for (let i = 0; i < ray.length; i++) {
      const t = ray[i];
      const p = b[t];
      if (p === EMPTY) continue;
      if (sideOf(p) === by && isBishopLike(abs(p))) return true;
      break;
    }
  }

  return false;
}

function inCheck(state, side) {
  const ksq = side === WHITE ? state.wKing : state.bKing;
  return isSquareAttacked(state, ksq, -side);
}

function addMove(list, from, to, flags = 0, promo = 0) {
  list.push({ from, to, flags, promo });
}

// Pseudo moves for one square
function genMovesFrom(state, from, out) {
  const b = state.board;
  const p = b[from];
  if (p === EMPTY) return;
  const side = state.turn;
  if (sideOf(p) !== side) return;

  const a = abs(p);

  // Pawn
  if (a === 1) {
    const r = rOf(from), c = cOf(from);
    const fwd = (side === WHITE) ? -1 : 1;
    const startRank = (side === WHITE) ? 6 : 1;
    const promoRank = (side === WHITE) ? 0 : 7;

    const r1 = r + fwd;
    if (r1 >= 0 && r1 < 8) {
      const one = idx(r1, c);
      if (b[one] === EMPTY) {
        if (r1 === promoRank) addMove(out, from, one, F_PROMO, side === WHITE ? WQ : BQ);
        else addMove(out, from, one);

        if (r === startRank) {
          const r2 = r + 2 * fwd;
          const two = idx(r2, c);
          if (b[two] === EMPTY) addMove(out, from, two, F_PAWN2);
        }
      }

      // captures
      if (c > 0) {
        const cap = idx(r1, c - 1);
        const tp = b[cap];
        if (tp !== EMPTY && sideOf(tp) === -side) {
          if (r1 === promoRank) addMove(out, from, cap, F_CAPTURE | F_PROMO, side === WHITE ? WQ : BQ);
          else addMove(out, from, cap, F_CAPTURE);
        }
      }
      if (c < 7) {
        const cap = idx(r1, c + 1);
        const tp = b[cap];
        if (tp !== EMPTY && sideOf(tp) === -side) {
          if (r1 === promoRank) addMove(out, from, cap, F_CAPTURE | F_PROMO, side === WHITE ? WQ : BQ);
          else addMove(out, from, cap, F_CAPTURE);
        }
      }

      // en passant
      if (state.ep !== -1) {
        if (c > 0 && idx(r1, c - 1) === state.ep) addMove(out, from, state.ep, F_CAPTURE | F_EP);
        if (c < 7 && idx(r1, c + 1) === state.ep) addMove(out, from, state.ep, F_CAPTURE | F_EP);
      }
    }
    return;
  }

  // Knight
  if (a === 2) {
    for (const to of KNIGHT_MOVES[from]) {
      const tp = b[to];
      if (tp === EMPTY) addMove(out, from, to);
      else if (sideOf(tp) === -side) addMove(out, from, to, F_CAPTURE);
    }
    return;
  }

  // King
  if (a === 6) {
    for (const to of KING_MOVES[from]) {
      const tp = b[to];
      if (tp === EMPTY) addMove(out, from, to);
      else if (sideOf(tp) === -side) addMove(out, from, to, F_CAPTURE);
    }

    // Castling (path emptiness here, attacked squares checked in castleIsLegal)
    if (side === WHITE && from === idx(7, 4)) {
      if ((state.castling & CWK) && b[idx(7,5)]===EMPTY && b[idx(7,6)]===EMPTY) addMove(out, from, idx(7,6), F_CASTLE);
      if ((state.castling & CWQ) && b[idx(7,3)]===EMPTY && b[idx(7,2)]===EMPTY && b[idx(7,1)]===EMPTY) addMove(out, from, idx(7,2), F_CASTLE);
    }
    if (side === BLACK && from === idx(0, 4)) {
      if ((state.castling & CBK) && b[idx(0,5)]===EMPTY && b[idx(0,6)]===EMPTY) addMove(out, from, idx(0,6), F_CASTLE);
      if ((state.castling & CBQ) && b[idx(0,3)]===EMPTY && b[idx(0,2)]===EMPTY && b[idx(0,1)]===EMPTY) addMove(out, from, idx(0,2), F_CASTLE);
    }

    return;
  }

  // Sliders: queen
  if (a === 5) {
    for (let d = 0; d < 8; d++) {
      const ray = RAYS[from][d];
      for (let i = 0; i < ray.length; i++) {
        const to = ray[i];
        const tp = b[to];
        if (tp === EMPTY) addMove(out, from, to);
        else {
          if (sideOf(tp) === -side) addMove(out, from, to, F_CAPTURE);
          break;
        }
      }
    }
    return;
  }

  // Sliders: rook or bishop
  const startDir = (a === 4) ? 0 : 4;
  const endDir = (a === 4) ? 4 : 8;
  for (let d = startDir; d < endDir; d++) {
    const ray = RAYS[from][d];
    for (let i = 0; i < ray.length; i++) {
      const to = ray[i];
      const tp = b[to];
      if (tp === EMPTY) addMove(out, from, to);
      else {
        if (sideOf(tp) === -side) addMove(out, from, to, F_CAPTURE);
        break;
      }
    }
  }
}

// Undo record:
// { from,to,moved,captured,flags,promo,castling,ep,halfmove,fullmove,wKing,bKing }
function pushUndo(state, rec) {
  state.history.push(rec);
}

// Castling legality: king not in check and does not pass through attacked squares
function castleIsLegal(state, move) {
  if (!(move.flags & F_CASTLE)) return true;
  const side = state.turn;
  if (inCheck(state, side)) return false;
  const opp = -side;

  if (side === WHITE) {
    if (move.to === idx(7,6)) {
      if (isSquareAttacked(state, idx(7,5), opp) || isSquareAttacked(state, idx(7,6), opp)) return false;
    } else {
      if (isSquareAttacked(state, idx(7,3), opp) || isSquareAttacked(state, idx(7,2), opp)) return false;
    }
  } else {
    if (move.to === idx(0,6)) {
      if (isSquareAttacked(state, idx(0,5), opp) || isSquareAttacked(state, idx(0,6), opp)) return false;
    } else {
      if (isSquareAttacked(state, idx(0,3), opp) || isSquareAttacked(state, idx(0,2), opp)) return false;
    }
  }
  return true;
}

// Apply move (internal raw move), with optional dryRun
export function applyMove(state, move, { dryRun = false } = {}) {
  const b = state.board;
  const from = move.from;
  const to = move.to;
  const moved = b[from];
  const side = state.turn;

  let captured = b[to];

  if (!dryRun) {
    pushUndo(state, {
      from, to,
      moved,
      captured,
      flags: move.flags | 0,
      promo: move.promo | 0,
      castling: state.castling,
      ep: state.ep,
      halfmove: state.halfmove,
      fullmove: state.fullmove,
      wKing: state.wKing,
      bKing: state.bKing
    });
  }

  // clear ep by default
  state.ep = -1;

  // halfmove clock
  if (abs(moved) === 1 || captured !== EMPTY || (move.flags & F_EP)) state.halfmove = 0;
  else state.halfmove++;

  // EP capture
  if (move.flags & F_EP) {
    const tr = rOf(to);
    const tc = cOf(to);
    const capSq = idx(tr + (side === WHITE ? 1 : -1), tc);
    captured = b[capSq];
    b[capSq] = EMPTY;
  }

  // move piece
  b[to] = moved;
  b[from] = EMPTY;

  // promotion
  if (move.flags & F_PROMO) {
    b[to] = move.promo;
  }

  // update king square
  if (moved === WK) state.wKing = to;
  else if (moved === BK) state.bKing = to;

  // castling rook move
  if (move.flags & F_CASTLE) {
    if (to === idx(7,6)) { b[idx(7,5)] = WR; b[idx(7,7)] = EMPTY; }
    else if (to === idx(7,2)) { b[idx(7,3)] = WR; b[idx(7,0)] = EMPTY; }
    else if (to === idx(0,6)) { b[idx(0,5)] = BR; b[idx(0,7)] = EMPTY; }
    else if (to === idx(0,2)) { b[idx(0,3)] = BR; b[idx(0,0)] = EMPTY; }
  }

  // update castling rights
  if (moved === WK) state.castling &= ~(CWK | CWQ);
  else if (moved === BK) state.castling &= ~(CBK | CBQ);

  if (moved === WR) {
    if (from === idx(7,0)) state.castling &= ~CWQ;
    else if (from === idx(7,7)) state.castling &= ~CWK;
  } else if (moved === BR) {
    if (from === idx(0,0)) state.castling &= ~CBQ;
    else if (from === idx(0,7)) state.castling &= ~CBK;
  }

  // rook captured on original squares
  if (captured === WR) {
    if (to === idx(7,0)) state.castling &= ~CWQ;
    else if (to === idx(7,7)) state.castling &= ~CWK;
  } else if (captured === BR) {
    if (to === idx(0,0)) state.castling &= ~CBQ;
    else if (to === idx(0,7)) state.castling &= ~CBK;
  }

  // set ep square if pawn double
  if (move.flags & F_PAWN2) {
    const fr = rOf(from);
    const fc = cOf(from);
    state.ep = idx(fr + (side === WHITE ? -1 : 1), fc);
  }

  // toggle turn / fullmove
  state.turn = -state.turn;
  if (state.turn === WHITE) state.fullmove++;

  if (!dryRun) {
    state.lastMoveSAN = moveToSAN(state, move, moved, captured);
  }

  return state;
}

export function undo(state) {
  const rec = state.history.pop();
  if (!rec) return state;

  const b = state.board;

  // restore meta
  state.turn = -state.turn;
  state.castling = rec.castling;
  state.ep = rec.ep;
  state.halfmove = rec.halfmove;
  state.fullmove = rec.fullmove;
  state.wKing = rec.wKing;
  state.bKing = rec.bKing;

  const from = rec.from;
  const to = rec.to;

  // undo castling rook first
  if (rec.flags & F_CASTLE) {
    if (to === idx(7,6)) { b[idx(7,7)] = WR; b[idx(7,5)] = EMPTY; }
    else if (to === idx(7,2)) { b[idx(7,0)] = WR; b[idx(7,3)] = EMPTY; }
    else if (to === idx(0,6)) { b[idx(0,7)] = BR; b[idx(0,5)] = EMPTY; }
    else if (to === idx(0,2)) { b[idx(0,0)] = BR; b[idx(0,3)] = EMPTY; }
  }

  // move back
  b[from] = rec.moved;
  b[to] = rec.captured;

  // undo EP capture
  if (rec.flags & F_EP) {
    const tr = rOf(to);
    const tc = cOf(to);
    const capSq = idx(tr + (state.turn === WHITE ? 1 : -1), tc);
    b[capSq] = (state.turn === WHITE) ? BP : WP;
    b[to] = EMPTY;
  }

  state.lastMoveSAN = null;
  return state;
}

// Temporary apply/unapply for legality without cloning
function applyMoveTemp(state, move) {
  const b = state.board;
  const from = move.from;
  const to = move.to;
  const moved = b[from];
  const captured = b[to];

  pushUndo(state, {
    from, to,
    moved,
    captured,
    flags: move.flags | 0,
    promo: move.promo | 0,
    castling: state.castling,
    ep: state.ep,
    halfmove: state.halfmove,
    fullmove: state.fullmove,
    wKing: state.wKing,
    bKing: state.bKing
  });

  const prevSAN = state.lastMoveSAN;
  applyMove(state, move, { dryRun: true });
  state.lastMoveSAN = prevSAN;
}

function undoTemp(state) {
  undo(state);
}

function hasAnyLegalMove(state) {
  const side = state.turn;
  const b = state.board;
  const start = (Math.random() * 64) | 0;

  for (let step = 0; step < 64; step++) {
    const sq = (start + step) & 63;
    const p = b[sq];
    if (p === EMPTY || sideOf(p) !== side) continue;

    const pseudo = [];
    genMovesFrom(state, sq, pseudo);
    for (let i = 0; i < pseudo.length; i++) {
      const m = pseudo[i];
      if ((m.flags & F_CASTLE) && !castleIsLegal(state, m)) continue;

      applyMoveTemp(state, m);
      const ok = !inCheck(state, -state.turn);
      undoTemp(state);
      if (ok) return true;
    }
  }
  return false;
}

function moveToSAN(stateAfter, move, movedPiece, capturedPiece) {
  // stateAfter is post-move; stateAfter.turn is opponent
  if (move.flags & F_CASTLE) {
    return (move.to === idx(7,6) || move.to === idx(0,6)) ? "O-O" : "O-O-O";
  }

  const movedAbs = abs(movedPiece);
  const isPawn = movedAbs === 1;
  const isCapture = (move.flags & F_CAPTURE) || (move.flags & F_EP) || (capturedPiece !== EMPTY);

  let s = "";
  if (!isPawn) s += " PNBRQK"[movedAbs];
  if (isCapture) {
    if (isPawn) s += FILES[cOf(move.from)];
    s += "x";
  }
  s += coordsToSquare(rOf(move.to), cOf(move.to));
  if (move.flags & F_PROMO) s += "=Q";

  const opp = stateAfter.turn;
  const chk = inCheck(stateAfter, opp);
  if (chk) {
    const any = hasAnyLegalMove(stateAfter);
    s += any ? "+" : "#";
  }

  return s;
}

// Public: returns legal moves for a selected piece (r,c) in UI-friendly shape
export function legalMovesFrom(state, r, c) {
  const from = idx(r, c);
  const pseudo = [];
  genMovesFrom(state, from, pseudo);
  if (!pseudo.length) return [];

  const legal = [];
  for (let i = 0; i < pseudo.length; i++) {
    const m = pseudo[i];
    if ((m.flags & F_CASTLE) && !castleIsLegal(state, m)) continue;

    applyMoveTemp(state, m);
    const ok = !inCheck(state, -state.turn);
    undoTemp(state);

    if (ok) {
      legal.push({
        from: { r, c },
        to: { r: rOf(m.to), c: cOf(m.to) },
        isCapture: !!(m.flags & F_CAPTURE),
        isEP: !!(m.flags & F_EP),
        isCastle: !!(m.flags & F_CASTLE),
        isPromo: !!(m.flags & F_PROMO),
        isDouble: !!(m.flags & F_PAWN2),
        _raw: m
      });
    }
  }

  return legal;
}

// Public: pick ONE legal move for side-to-move (UI shape). Avoids building a full move list.
export function pickOneLegalMove(state) {
  const side = state.turn;
  const b = state.board;

  const pieces = [];
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (p !== EMPTY && sideOf(p) === side) pieces.push(i);
  }
  if (!pieces.length) return null;

  let start = (Math.random() * pieces.length) | 0;
  for (let off = 0; off < pieces.length; off++) {
    const from = pieces[(start + off) % pieces.length];

    const pseudo = [];
    genMovesFrom(state, from, pseudo);
    if (!pseudo.length) continue;

    let mstart = (Math.random() * pseudo.length) | 0;
    for (let j = 0; j < pseudo.length; j++) {
      const m = pseudo[(mstart + j) % pseudo.length];
      if ((m.flags & F_CASTLE) && !castleIsLegal(state, m)) continue;

      applyMoveTemp(state, m);
      const ok = !inCheck(state, -state.turn);
      undoTemp(state);

      if (ok) {
        return {
          from: { r: rOf(from), c: cOf(from) },
          to: { r: rOf(m.to), c: cOf(m.to) },
          isCapture: !!(m.flags & F_CAPTURE),
          isEP: !!(m.flags & F_EP),
          isCastle: !!(m.flags & F_CASTLE),
          isPromo: !!(m.flags & F_PROMO),
          isDouble: !!(m.flags & F_PAWN2),
          _raw: m
        };
      }
    }
  }

  return null;
}

// Public: apply a UI move (uses the internal raw move when present)
export function applyUiMove(state, uiMove) {
  const raw = uiMove._raw;
  if (raw) {
    applyMove(state, raw, { dryRun: false });
    return state;
  }

  // Fallback build raw
  const from = idx(uiMove.from.r, uiMove.from.c);
  const to = idx(uiMove.to.r, uiMove.to.c);
  let flags = 0;
  if (uiMove.isCastle) flags |= F_CASTLE;
  if (uiMove.isEP) flags |= (F_EP | F_CAPTURE);
  if (uiMove.isCapture) flags |= F_CAPTURE;
  if (uiMove.isPromo) flags |= F_PROMO;
  if (uiMove.isDouble) flags |= F_PAWN2;
  const promo = (flags & F_PROMO) ? (state.turn === WHITE ? WQ : BQ) : 0;

  applyMove(state, { from, to, flags, promo }, { dryRun: false });
  return state;
}

// Public: fast game status (mate/stalemate via early-exit)
export function gameStatus(state) {
  const side = state.turn;
  const chk = inCheck(state, side);
  const any = hasAnyLegalMove(state);
  if (!any) {
    if (chk) return { over: true, result: (side === WHITE ? "Black" : "White") + " wins by checkmate" };
    return { over: true, result: "Draw by stalemate" };
  }
  return { over: false, inCheck: chk };
}

// Debug exports (safe to ignore in UI)
export const _internals = {
  toFEN,
  fromFEN,
  constants: { CWK, CWQ, CBK, CBQ, F_CAPTURE, F_EP, F_CASTLE, F_PROMO, F_PAWN2 }
};
// engine.js
// High-performance local chess core (no external deps)
// Optimizations:
// - Board: Int8Array(64) piece codes (0 empty, 1..6 white, -1..-6 black)
// - Make/Unmake (no deep clone) with compact undo stack
// - Cached king squares, castling rights bitmask, ep square index
// - Precomputed knight/king moves and sliding rays
// - Legality via temporary make/unmake + king-in-check test
// - Game status via early-exit (find any legal move)
// - FEN parse/emit for debugging + engine interoperability

// Piece codes
const EMPTY = 0;
const WP = 1, WN = 2, WB = 3, WR = 4, WQ = 5, WK = 6;
const BP = -1, BN = -2, BB = -3, BR = -4, BQ = -5, BK = -6;

// Sides
export const WHITE = 1;
export const BLACK = -1;

// Castling rights bitmask
const CWK = 1; // white O-O
const CWQ = 2; // white O-O-O
const CBK = 4; // black O-O
const CBQ = 8; // black O-O-O

// Move flags
const F_CAPTURE = 1 << 0;
const F_EP      = 1 << 1;
const F_CASTLE  = 1 << 2;
const F_PROMO   = 1 << 3;
const F_PAWN2   = 1 << 4;

// Unicode pieces
const UNICODE = {
  [WP]:"♙", [WN]:"♘", [WB]:"♗", [WR]:"♖", [WQ]:"♕", [WK]:"♔",
  [BP]:"♟", [BN]:"♞", [BB]:"♝", [BR]:"♜", [BQ]:"♛", [BK]:"♚"
};

// FEN maps
const FEN_TO_PIECE = {
  p: BP, n: BN, b: BB, r: BR, q: BQ, k: BK,
  P: WP, N: WN, B: WB, R: WR, Q: WQ, K: WK
};
const PIECE_TO_FEN = {
  [WP]:"P", [WN]:"N", [WB]:"B", [WR]:"R", [WQ]:"Q", [WK]:"K",
  [BP]:"p", [BN]:"n", [BB]:"b", [BR]:"r", [BQ]:"q", [BK]:"k"
};

const FILES = "abcdefgh";

function idx(r, c) { return (r << 3) | c; }
function rOf(i) { return i >> 3; }
function cOf(i) { return i & 7; }

export function coordsToSquare(r, c) {
  return FILES[c] + (8 - r);
}

export function squareToCoords(sq) {
  const c = FILES.indexOf(sq[0]);
  const r = 8 - (sq.charCodeAt(1) - 48);
  return { r, c };
}

export function pieceToChar(code) {
  return UNICODE[code] ?? "";
}

function sideOf(piece) {
  return piece > 0 ? WHITE : piece < 0 ? BLACK : 0;
}

function abs(piece) {
  return piece < 0 ? -piece : piece;
}

function isBishopLike(a) { return a === 3 || a === 5; }
function isRookLike(a)   { return a === 4 || a === 5; }

// Precomputed move tables
const KNIGHT_MOVES = Array.from({ length: 64 }, () => []);
const KING_MOVES = Array.from({ length: 64 }, () => []);
const RAYS = Array.from({ length: 64 }, () => Array.from({ length: 8 }, () => []));
// 0 N,1 S,2 W,3 E,4 NW,5 NE,6 SW,7 SE
const DIRS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1]
];

(function initTables() {
  const knightD = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const s = idx(r, c);
      for (const [dr, dc] of knightD) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) KNIGHT_MOVES[s].push(idx(rr, cc));
      }
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) KING_MOVES[s].push(idx(rr, cc));
        }
      }
      for (let d = 0; d < 8; d++) {
        const [dr, dc] = DIRS[d];
        let rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          RAYS[s][d].push(idx(rr, cc));
          rr += dr; cc += dc;
        }
      }
    }
  }
})();

function findKings(board) {
  let wK = -1, bK = -1;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p === WK) wK = i;
    else if (p === BK) bK = i;
  }
  return { wK, bK };
}

export function fromFEN(fen) {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) throw new Error("Invalid FEN");

  const board = new Int8Array(64);
  board.fill(EMPTY);

  const ranks = parts[0].split("/");
  if (ranks.length !== 8) throw new Error("Invalid FEN board");

  for (let r = 0; r < 8; r++) {
    let c = 0;
    const row = ranks[r];
    for (let k = 0; k < row.length; k++) {
      const ch = row[k];
      if (ch >= "1" && ch <= "8") {
        c += ch.charCodeAt(0) - 48;
      } else {
        const p = FEN_TO_PIECE[ch];
        if (p == null) throw new Error("Invalid FEN piece");
        board[idx(r, c)] = p;
        c++;
      }
    }
    if (c !== 8) throw new Error("Invalid FEN rank width");
  }

  const turn = parts[1] === "w" ? WHITE : BLACK;

  let castling = 0;
  const cst = parts[2];
  if (cst.includes("K")) castling |= CWK;
  if (cst.includes("Q")) castling |= CWQ;
  if (cst.includes("k")) castling |= CBK;
  if (cst.includes("q")) castling |= CBQ;

  let ep = -1;
  if (parts[3] !== "-") {
    const file = FILES.indexOf(parts[3][0]);
    const rank = parts[3].charCodeAt(1) - 48;
    const rr = 8 - rank;
    ep = idx(rr, file);
  }

  const halfmove = parts[4] ? parseInt(parts[4], 10) : 0;
  const fullmove = parts[5] ? parseInt(parts[5], 10) : 1;

  const kings = findKings(board);

  return {
    board,
    turn,
    castling,
    ep,
    halfmove,
    fullmove,
    wKing: kings.wK,
    bKing: kings.bK,
    history: [],
    lastMoveSAN: null
  };
}

export function toFEN(state) {
  let s = "";
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = state.board[idx(r, c)];
      if (p === EMPTY) {
        empty++;
      } else {
        if (empty) { s += String(empty); empty = 0; }
        s += PIECE_TO_FEN[p];
      }
    }
    if (empty) s += String(empty);
    if (r !== 7) s += "/";
  }

  s += " ";
  s += (state.turn === WHITE ? "w" : "b");
  s += " ";

  let cst = "";
  if (state.castling & CWK) cst += "K";
  if (state.castling & CWQ) cst += "Q";
  if (state.castling & CBK) cst += "k";
  if (state.castling & CBQ) cst += "q";
  s += (cst || "-");

  s += " ";
  s += (state.ep === -1 ? "-" : coordsToSquare(rOf(state.ep), cOf(state.ep)));

  s += " ";
  s += String(state.halfmove | 0);
  s += " ";
  s += String(state.fullmove | 0);

  return s;
}

export function newGameState() {
  return fromFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
}

// Is square attacked by side `by`?
function isSquareAttacked(state, sq, by) {
  const b = state.board;
  const r = rOf(sq), c = cOf(sq);

  // pawns
  if (by === WHITE) {
    const rr = r + 1;
    if (rr < 8) {
      if (c > 0 && b[idx(rr, c - 1)] === WP) return true;
      if (c < 7 && b[idx(rr, c + 1)] === WP) return true;
    }
  } else {
    const rr = r - 1;
    if (rr >= 0) {
      if (c > 0 && b[idx(rr, c - 1)] === BP) return true;
      if (c < 7 && b[idx(rr, c + 1)] === BP) return true;
    }
  }

  // knights
  for (const t of KNIGHT_MOVES[sq]) {
    const p = b[t];
    if (p !== EMPTY && sideOf(p) === by && abs(p) === 2) return true;
  }

  // kings
  for (const t of KING_MOVES[sq]) {
    const p = b[t];
    if (p !== EMPTY && sideOf(p) === by && abs(p) === 6) return true;
  }

  // rook/queen rays
  for (let d = 0; d < 4; d++) {
    const ray = RAYS[sq][d];
    for (let i = 0; i < ray.length; i++) {
      const t = ray[i];
      const p = b[t];
      if (p === EMPTY) continue;
      if (sideOf(p) === by && isRookLike(abs(p))) return true;
      break;
    }
  }

  // bishop/queen rays
  for (let d = 4; d < 8; d++) {
    const ray = RAYS[sq][d];
    for (let i = 0; i < ray.length; i++) {
      const t = ray[i];
      const p = b[t];
      if (p === EMPTY) continue;
      if (sideOf(p) === by && isBishopLike(abs(p))) return true;
      break;
    }
  }

  return false;
}

function inCheck(state, side) {
  const ksq = side === WHITE ? state.wKing : state.bKing;
  return isSquareAttacked(state, ksq, -side);
}

function addMove(list, from, to, flags = 0, promo = 0) {
  list.push({ from, to, flags, promo });
}

// Pseudo moves for one square
function genMovesFrom(state, from, out) {
  const b = state.board;
  const p = b[from];
  if (p === EMPTY) return;
  const side = state.turn;
  if (sideOf(p) !== side) return;

  const a = abs(p);

  // Pawn
  if (a === 1) {
    const r = rOf(from), c = cOf(from);
    const fwd = (side === WHITE) ? -1 : 1;
    const startRank = (side === WHITE) ? 6 : 1;
    const promoRank = (side === WHITE) ? 0 : 7;

    const r1 = r + fwd;
    if (r1 >= 0 && r1 < 8) {
      const one = idx(r1, c);
      if (b[one] === EMPTY) {
        if (r1 === promoRank) addMove(out, from, one, F_PROMO, side === WHITE ? WQ : BQ);
        else addMove(out, from, one);

        if (r === startRank) {
          const r2 = r + 2 * fwd;
          const two = idx(r2, c);
          if (b[two] === EMPTY) addMove(out, from, two, F_PAWN2);
        }
      }

      // captures
      if (c > 0) {
        const cap = idx(r1, c - 1);
        const tp = b[cap];
        if (tp !== EMPTY && sideOf(tp) === -side) {
          if (r1 === promoRank) addMove(out, from, cap, F_CAPTURE | F_PROMO, side === WHITE ? WQ : BQ);
          else addMove(out, from, cap, F_CAPTURE);
        }
      }
      if (c < 7) {
        const cap = idx(r1, c + 1);
        const tp = b[cap];
        if (tp !== EMPTY && sideOf(tp) === -side) {
          if (r1 === promoRank) addMove(out, from, cap, F_CAPTURE | F_PROMO, side === WHITE ? WQ : BQ);
          else addMove(out, from, cap, F_CAPTURE);
        }
      }

      // en passant
      if (state.ep !== -1) {
        if (c > 0 && idx(r1, c - 1) === state.ep) addMove(out, from, state.ep, F_CAPTURE | F_EP);
        if (c < 7 && idx(r1, c + 1) === state.ep) addMove(out, from, state.ep, F_CAPTURE | F_EP);
      }
    }
    return;
  }

  // Knight
  if (a === 2) {
    for (const to of KNIGHT_MOVES[from]) {
      const tp = b[to];
      if (tp === EMPTY) addMove(out, from, to);
      else if (sideOf(tp) === -side) addMove(out, from, to, F_CAPTURE);
    }
    return;
  }

  // King
  if (a === 6) {
    for (const to of KING_MOVES[from]) {
      const tp = b[to];
      if (tp === EMPTY) addMove(out, from, to);
      else if (sideOf(tp) === -side) addMove(out, from, to, F_CAPTURE);
    }

    // Castling (path squares checked in castleIsLegal + normal legality test)
    if (side === WHITE && from === idx(7, 4)) {
      if ((state.castling & CWK) && b[idx(7,5)]===EMPTY && b[idx(7,6)]===EMPTY) addMove(out, from, idx(7,6), F_CASTLE);
      if ((state.castling & CWQ) && b[idx(7,3)]===EMPTY && b[idx(7,2)]===EMPTY && b[idx(7,1)]===EMPTY) addMove(out, from, idx(7,2), F_CASTLE);
    }
    if (side === BLACK && from === idx(0, 4)) {
      if ((state.castling & CBK) && b[idx(0,5)]===EMPTY && b[idx(0,6)]===EMPTY) addMove(out, from, idx(0,6), F_CASTLE);
      if ((state.castling & CBQ) && b[idx(0,3)]===EMPTY && b[idx(0,2)]===EMPTY && b[idx(0,1)]===EMPTY) addMove(out, from, idx(0,2), F_CASTLE);
    }

    return;
  }

  // Sliders
  // Queen: all dirs
  if (a === 5) {
    for (let d = 0; d < 8; d++) {
      const ray = RAYS[from][d];
      for (let i = 0; i < ray.length; i++) {
        const to = ray[i];
        const tp = b[to];
        if (tp === EMPTY) addMove(out, from, to);
        else {
          if (sideOf(tp) === -side) addMove(out, from, to, F_CAPTURE);
          break;
        }
      }
    }
    return;
  }

  // Bishop or rook
  const startDir = (a === 4) ? 0 : 4;
  const endDir = (a === 4) ? 4 : 8;
  for (let d = startDir; d < endDir; d++) {
    const ray = RAYS[from][d];
    for (let i = 0; i < ray.length; i++) {
      const to = ray[i];
      const tp = b[to];
      if (tp === EMPTY) addMove(out, from, to);
      else {
        if (sideOf(tp) === -side) addMove(out, from, to, F_CAPTURE);
        break;
      }
    }
  }
}

// Undo record:
// { from,to,moved,captured,flags,promo,castling,ep,halfmove,fullmove,wKing,bKing }
function pushUndo(state, rec) {
  state.history.push(rec);
}

// Castling legality: king not in check and does not pass through attacked squares
function castleIsLegal(state, move) {
  if (!(move.flags & F_CASTLE)) return true;
  const side = state.turn;
  if (inCheck(state, side)) return false;
  const opp = -side;

  if (side === WHITE) {
    if (move.to === idx(7,6)) {
      if (isSquareAttacked(state, idx(7,5), opp) || isSquareAttacked(state, idx(7,6), opp)) return false;
    } else {
      if (isSquareAttacked(state, idx(7,3), opp) || isSquareAttacked(state, idx(7,2), opp)) return false;
    }
  } else {
    if (move.to === idx(0,6)) {
      if (isSquareAttacked(state, idx(0,5), opp) || isSquareAttacked(state, idx(0,6), opp)) return false;
    } else {
      if (isSquareAttacked(state, idx(0,3), opp) || isSquareAttacked(state, idx(0,2), opp)) return false;
    }
  }
  return true;
}

// Apply move (internal raw move), with optional dryRun
export function applyMove(state, move, { dryRun = false } = {}) {
  const b = state.board;
  const from = move.from;
  const to = move.to;
  const moved = b[from];
  const side = state.turn;

  let captured = b[to];

  if (!dryRun) {
    pushUndo(state, {
      from, to,
      moved,
      captured,
      flags: move.flags | 0,
      promo: move.promo | 0,
      castling: state.castling,
      ep: state.ep,
      halfmove: state.halfmove,
      fullmove: state.fullmove,
      wKing: state.wKing,
      bKing: state.bKing
    });
  }

  // clear ep by default
  state.ep = -1;

  // halfmove clock
  if (abs(moved) === 1 || captured !== EMPTY || (move.flags & F_EP)) state.halfmove = 0;
  else state.halfmove++;

  // EP capture
  if (move.flags & F_EP) {
    const tr = rOf(to);
    const tc = cOf(to);
    const capSq = idx(tr + (side === WHITE ? 1 : -1), tc);
    captured = b[capSq];
    b[capSq] = EMPTY;
  }

  // move piece
  b[to] = moved;
  b[from] = EMPTY;

  // promotion
  if (move.flags & F_PROMO) {
    b[to] = move.promo;
  }

  // update king square
  if (moved === WK) state.wKing = to;
  else if (moved === BK) state.bKing = to;

  // castling rook move
  if (move.flags & F_CASTLE) {
    if (to === idx(7,6)) { b[idx(7,5)] = WR; b[idx(7,7)] = EMPTY; }
    else if (to === idx(7,2)) { b[idx(7,3)] = WR; b[idx(7,0)] = EMPTY; }
    else if (to === idx(0,6)) { b[idx(0,5)] = BR; b[idx(0,7)] = EMPTY; }
    else if (to === idx(0,2)) { b[idx(0,3)] = BR; b[idx(0,0)] = EMPTY; }
  }

  // update castling rights
  if (moved === WK) state.castling &= ~(CWK | CWQ);
  else if (moved === BK) state.castling &= ~(CBK | CBQ);

  if (moved === WR) {
    if (from === idx(7,0)) state.castling &= ~CWQ;
    else if (from === idx(7,7)) state.castling &= ~CWK;
  } else if (moved === BR) {
    if (from === idx(0,0)) state.castling &= ~CBQ;
    else if (from === idx(0,7)) state.castling &= ~CBK;
  }

  // rook captured on original squares
  if (captured === WR) {
    if (to === idx(7,0)) state.castling &= ~CWQ;
    else if (to === idx(7,7)) state.castling &= ~CWK;
  } else if (captured === BR) {
    if (to === idx(0,0)) state.castling &= ~CBQ;
    else if (to === idx(0,7)) state.castling &= ~CBK;
  }

  // set ep square if pawn double
  if (move.flags & F_PAWN2) {
    const fr = rOf(from);
    const fc = cOf(from);
    state.ep = idx(fr + (side === WHITE ? -1 : 1), fc);
  }

  // toggle turn / fullmove
  state.turn = -state.turn;
  if (state.turn === WHITE) state.fullmove++;

  if (!dryRun) {
    state.lastMoveSAN = moveToSAN(state, move, moved, captured);
  }

  return state;
}

export function undo(state) {
  const rec = state.history.pop();
  if (!rec) return state;

  const b = state.board;

  // restore meta
  state.turn = -state.turn;
  state.castling = rec.castling;
  state.ep = rec.ep;
  state.halfmove = rec.halfmove;
  state.fullmove = rec.fullmove;
  state.wKing = rec.wKing;
  state.bKing = rec.bKing;

  const from = rec.from;
  const to = rec.to;

  // undo castling rook first
  if (rec.flags & F_CASTLE) {
    if (to === idx(7,6)) { b[idx(7,7)] = WR; b[idx(7,5)] = EMPTY; }
    else if (to === idx(7,2)) { b[idx(7,0)] = WR; b[idx(7,3)] = EMPTY; }
    else if (to === idx(0,6)) { b[idx(0,7)] = BR; b[idx(0,5)] = EMPTY; }
    else if (to === idx(0,2)) { b[idx(0,0)] = BR; b[idx(0,3)] = EMPTY; }
  }

  // move back
  b[from] = rec.moved;
  b[to] = rec.captured;

  // undo EP capture
  if (rec.flags & F_EP) {
    const tr = rOf(to);
    const tc = cOf(to);
    const capSq = idx(tr + (state.turn === WHITE ? 1 : -1), tc);
    b[capSq] = (state.turn === WHITE) ? BP : WP;
    b[to] = EMPTY;
  }

  state.lastMoveSAN = null;
  return state;
}

// Temporary apply/unapply for legality without cloning
function applyMoveTemp(state, move) {
  const b = state.board;
  const from = move.from;
  const to = move.to;
  const moved = b[from];
  const captured = b[to];

  pushUndo(state, {
    from, to,
    moved,
    captured,
    flags: move.flags | 0,
    promo: move.promo | 0,
    castling: state.castling,
    ep: state.ep,
    halfmove: state.halfmove,
    fullmove: state.fullmove,
    wKing: state.wKing,
    bKing: state.bKing
  });

  const prevSAN = state.lastMoveSAN;
  applyMove(state, move, { dryRun: true });
  state.lastMoveSAN = prevSAN;
}

function undoTemp(state) {
  undo(state);
}

function hasAnyLegalMove(state) {
  const side = state.turn;
  const b = state.board;
  const start = (Math.random() * 64) | 0;

  for (let step = 0; step < 64; step++) {
    const sq = (start + step) & 63;
    const p = b[sq];
    if (p === EMPTY || sideOf(p) !== side) continue;

    const pseudo = [];
    genMovesFrom(state, sq, pseudo);
    for (let i = 0; i < pseudo.length; i++) {
      const m = pseudo[i];
      if ((m.flags & F_CASTLE) && !castleIsLegal(state, m)) continue;

      applyMoveTemp(state, m);
      const ok = !inCheck(state, -state.turn);
      undoTemp(state);
      if (ok) return true;
    }
  }
  return false;
}

function moveToSAN(stateAfter, move, movedPiece, capturedPiece) {
  // stateAfter is post-move; stateAfter.turn is opponent
  if (move.flags & F_CASTLE) {
    return (move.to === idx(7,6) || move.to === idx(0,6)) ? "O-O" : "O-O-O";
  }

  const movedAbs = abs(movedPiece);
  const isPawn = movedAbs === 1;
  const isCapture = (move.flags & F_CAPTURE) || (move.flags & F_EP) || (capturedPiece !== EMPTY);

  let s = "";
  if (!isPawn) s += " PNBRQK"[movedAbs];
  if (isCapture) {
    if (isPawn) s += FILES[cOf(move.from)];
    s += "x";
  }
  s += coordsToSquare(rOf(move.to), cOf(move.to));
  if (move.flags & F_PROMO) s += "=Q";

  const opp = stateAfter.turn;
  const chk = inCheck(stateAfter, opp);
  if (chk) {
    const any = hasAnyLegalMove(stateAfter);
    s += any ? "+" : "#";
  }

  return s;
}

// Public: returns legal moves for a selected piece (r,c) in UI-friendly shape
export function legalMovesFrom(state, r, c) {
  const from = idx(r, c);
  const pseudo = [];
  genMovesFrom(state, from, pseudo);
  if (!pseudo.length) return [];

  const legal = [];
  for (let i = 0; i < pseudo.length; i++) {
    const m = pseudo[i];
    if ((m.flags & F_CASTLE) && !castleIsLegal(state, m)) continue;

    applyMoveTemp(state, m);
    const ok = !inCheck(state, -state.turn);
    undoTemp(state);

    if (ok) {
      legal.push({
        from: { r, c },
        to: { r: rOf(m.to), c: cOf(m.to) },
        isCapture: !!(m.flags & F_CAPTURE),
        isEP: !!(m.flags & F_EP),
        isCastle: !!(m.flags & F_CASTLE),
        isPromo: !!(m.flags & F_PROMO),
        isDouble: !!(m.flags & F_PAWN2),
        _raw: m
      });
    }
  }

  return legal;
}

// Public: pick ONE legal move for side-to-move (UI shape). Avoids building a full move list.
export function pickOneLegalMove(state) {
  const side = state.turn;
  const b = state.board;

  const pieces = [];
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (p !== EMPTY && sideOf(p) === side) pieces.push(i);
  }
  if (!pieces.length) return null;

  let start = (Math.random() * pieces.length) | 0;
  for (let off = 0; off < pieces.length; off++) {
    const from = pieces[(start + off) % pieces.length];

    const pseudo = [];
    genMovesFrom(state, from, pseudo);
    if (!pseudo.length) continue;

    let mstart = (Math.random() * pseudo.length) | 0;
    for (let j = 0; j < pseudo.length; j++) {
      const m = pseudo[(mstart + j) % pseudo.length];
      if ((m.flags & F_CASTLE) && !castleIsLegal(state, m)) continue;

      applyMoveTemp(state, m);
      const ok = !inCheck(state, -state.turn);
      undoTemp(state);

      if (ok) {
        return {
          from: { r: rOf(from), c: cOf(from) },
          to: { r: rOf(m.to), c: cOf(m.to) },
          isCapture: !!(m.flags & F_CAPTURE),
          isEP: !!(m.flags & F_EP),
          isCastle: !!(m.flags & F_CASTLE),
          isPromo: !!(m.flags & F_PROMO),
          isDouble: !!(m.flags & F_PAWN2),
          _raw: m
        };
      }
    }
  }

  return null;
}

// Public: apply a UI move (uses the internal raw move when present)
export function applyUiMove(state, uiMove) {
  const raw = uiMove._raw;
  if (raw) {
    applyMove(state, raw, { dryRun: false });
    return state;
  }

  // Fallback build raw
  const from = idx(uiMove.from.r, uiMove.from.c);
  const to = idx(uiMove.to.r, uiMove.to.c);
  let flags = 0;
  if (uiMove.isCastle) flags |= F_CASTLE;
  if (uiMove.isEP) flags |= (F_EP | F_CAPTURE);
  if (uiMove.isCapture) flags |= F_CAPTURE;
  if (uiMove.isPromo) flags |= F_PROMO;
  if (uiMove.isDouble) flags |= F_PAWN2;
  const promo = (flags & F_PROMO) ? (state.turn === WHITE ? WQ : BQ) : 0;

  applyMove(state, { from, to, flags, promo }, { dryRun: false });
  return state;
}

// Public: fast game status (mate/stalemate via early-exit)
export function gameStatus(state) {
  const side = state.turn;
  const chk = inCheck(state, side);
  const any = hasAnyLegalMove(state);
  if (!any) {
    if (chk) return { over: true, result: (side === WHITE ? "Black" : "White") + " wins by checkmate" };
    return { over: true, result: "Draw by stalemate" };
  }
  return { over: false, inCheck: chk };
}

// Debug exports
export const_internals = {
  toFEN,
  fromFEN,
  constants: { CWK, CWQ, CBK, CBQ, F_CAPTURE, F_EP, F_CASTLE, F_PROMO, F_PAWN2 }
};