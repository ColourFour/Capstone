from __future__ import annotations

from dataclasses import dataclass
from math import inf
from typing import Optional

from rules import BLACK, WHITE, Board, Move


MATERIAL = {
    "P": 100,
    "N": 320,
    "B": 330,
    "R": 500,
    "Q": 900,
    "K": 0,
}

PAWN_TABLE = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
]

KNIGHT_TABLE = [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
]

BISHOP_TABLE = [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
]

ROOK_TABLE = [
    [0, 0, 0, 5, 5, 0, 0, 0],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
]

QUEEN_TABLE = [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
]

KING_TABLE = [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20],
]

PIECE_TABLES = {
    "P": PAWN_TABLE,
    "N": KNIGHT_TABLE,
    "B": BISHOP_TABLE,
    "R": ROOK_TABLE,
    "Q": QUEEN_TABLE,
    "K": KING_TABLE,
}


@dataclass
class SearchResult:
    move: Optional[Move]
    score: int
    depth: int


class SimpleEngine:
    def __init__(self, max_depth: int = 2) -> None:
        self.max_depth = max_depth

    def best_move(self, board: Board, depth: Optional[int] = None) -> SearchResult:
        target_depth = depth or self.max_depth
        maximizing = board.side_to_move() == WHITE
        best_score = -inf if maximizing else inf
        best_move: Optional[Move] = None

        for move in self._ordered_moves(board):
            next_board = board.clone()
            next_board.push(move)
            score = self._search(next_board, target_depth - 1, -inf, inf)
            if maximizing and score > best_score:
                best_score = score
                best_move = move
            elif not maximizing and score < best_score:
                best_score = score
                best_move = move

        if best_move is None:
            terminal = self.evaluate(board)
            return SearchResult(move=None, score=terminal, depth=target_depth)
        return SearchResult(move=best_move, score=int(best_score), depth=target_depth)

    def iterative_deepening(self, board: Board, max_depth: int) -> SearchResult:
        result = SearchResult(move=None, score=self.evaluate(board), depth=0)
        for depth in range(1, max_depth + 1):
            result = self.best_move(board, depth=depth)
        return result

    def _search(self, board: Board, depth: int, alpha: float, beta: float) -> int:
        if depth == 0 or board.is_checkmate() or board.is_draw():
            return self.evaluate(board)

        maximizing = board.side_to_move() == WHITE
        if maximizing:
            value = -inf
            for move in self._ordered_moves(board):
                next_board = board.clone()
                next_board.push(move)
                value = max(value, self._search(next_board, depth - 1, alpha, beta))
                alpha = max(alpha, value)
                if alpha >= beta:
                    break
            return int(value)

        value = inf
        for move in self._ordered_moves(board):
            next_board = board.clone()
            next_board.push(move)
            value = min(value, self._search(next_board, depth - 1, alpha, beta))
            beta = min(beta, value)
            if beta <= alpha:
                break
        return int(value)

    def evaluate(self, board: Board) -> int:
        if board.is_checkmate():
            return -100000 if board.side_to_move() == WHITE else 100000
        if board.is_draw():
            return 0

        total = 0
        for row in range(8):
            for col in range(8):
                piece = board.board[row][col]
                if not piece:
                    continue
                upper = piece.upper()
                value = MATERIAL[upper] + self._table_value(upper, row, col, piece.isupper())
                total += value if piece.isupper() else -value
        return total

    def _ordered_moves(self, board: Board) -> list[Move]:
        def move_score(move: Move) -> int:
            target = board.piece_at(move.to_row, move.to_col)
            score = 0
            if target:
                score += MATERIAL[target.upper()]
            if move.promotion:
                score += MATERIAL[move.promotion.upper()]
            if move.is_castling:
                score += 25
            return score

        return sorted(board.legal_moves(), key=move_score, reverse=True)

    def _table_value(self, piece: str, row: int, col: int, is_white: bool) -> int:
        table = PIECE_TABLES[piece]
        table_row = row if is_white else 7 - row
        return table[table_row][col]
