from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Optional

import fen


WHITE = "w"
BLACK = "b"

STARTING_FEN = "rn1qkbnr/pppb1ppp/3pp3/8/3PP3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 1"
INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

PIECE_DIRECTIONS = {
    "N": [(-2, -1), (-2, 1), (-1, -2), (-1, 2), (1, -2), (1, 2), (2, -1), (2, 1)],
    "B": [(-1, -1), (-1, 1), (1, -1), (1, 1)],
    "R": [(-1, 0), (1, 0), (0, -1), (0, 1)],
    "Q": [(-1, -1), (-1, 1), (1, -1), (1, 1), (-1, 0), (1, 0), (0, -1), (0, 1)],
    "K": [(-1, -1), (-1, 1), (1, -1), (1, 1), (-1, 0), (1, 0), (0, -1), (0, 1)],
}


@dataclass(frozen=True)
class Move:
    from_row: int
    from_col: int
    to_row: int
    to_col: int
    promotion: Optional[str] = None
    is_en_passant: bool = False
    is_castling: bool = False

    def uci(self) -> str:
        text = fen.coords_to_algebraic(self.from_row, self.from_col)
        text += fen.coords_to_algebraic(self.to_row, self.to_col)
        if self.promotion:
            text += self.promotion.lower()
        return text


class Board:
    def __init__(
        self,
        board: Optional[fen.BoardMatrix] = None,
        active_color: str = WHITE,
        castling_rights: str = "KQkq",
        en_passant_target: str = "-",
        halfmove_clock: int = 0,
        fullmove_number: int = 1,
        history: Optional[list[str]] = None,
    ) -> None:
        self.board = board or [[None for _ in range(8)] for _ in range(8)]
        self.active_color = active_color
        self.castling_rights = castling_rights if castling_rights != "-" else ""
        self.en_passant_target = en_passant_target
        self.halfmove_clock = halfmove_clock
        self.fullmove_number = fullmove_number
        self.position_history = list(history or [])
        if not self.position_history:
            self.position_history.append(self.position_key())

    @classmethod
    def from_fen(cls, fen_text: str) -> "Board":
        state = fen.parse_fen(fen_text)
        return cls(
            board=state["board"],
            active_color=state["active"],
            castling_rights=state["castling"] if state["castling"] != "-" else "",
            en_passant_target=state["en_passant"],
            halfmove_clock=state["halfmove"],
            fullmove_number=state["fullmove"],
        )

    def clone(self) -> "Board":
        return Board(
            board=[row[:] for row in self.board],
            active_color=self.active_color,
            castling_rights=self.castling_rights,
            en_passant_target=self.en_passant_target,
            halfmove_clock=self.halfmove_clock,
            fullmove_number=self.fullmove_number,
            history=self.position_history[:],
        )

    def to_fen(self) -> str:
        return fen.build_fen(
            self.board,
            self.active_color,
            self.castling_rights or "-",
            self.en_passant_target,
            self.halfmove_clock,
            self.fullmove_number,
        )

    def position_key(self) -> str:
        return fen.build_fen(
            self.board,
            self.active_color,
            self.castling_rights or "-",
            self.en_passant_target,
            0,
            1,
        )

    def piece_at(self, row: int, col: int) -> Optional[str]:
        return self.board[row][col]

    def set_piece(self, row: int, col: int, piece: Optional[str]) -> None:
        self.board[row][col] = piece

    def side_to_move(self) -> str:
        return self.active_color

    def legal_moves(self) -> list[Move]:
        moves = []
        for move in self.pseudo_legal_moves():
            next_board = self.clone()
            next_board.push(move, record_history=False)
            if not next_board.is_in_check(self.active_color):
                moves.append(move)
        return moves

    def pseudo_legal_moves(self) -> Iterable[Move]:
        for row in range(8):
            for col in range(8):
                piece = self.board[row][col]
                if not piece or self._color_of(piece) != self.active_color:
                    continue
                yield from self._piece_moves(row, col, piece)

    def push(self, move: Move, record_history: bool = True) -> None:
        piece = self.board[move.from_row][move.from_col]
        if piece is None:
            raise ValueError("Cannot move from an empty square")
        target = self.board[move.to_row][move.to_col]
        mover = self._color_of(piece)

        self.board[move.from_row][move.from_col] = None

        if move.is_en_passant:
            capture_row = move.to_row + (1 if mover == WHITE else -1)
            self.board[capture_row][move.to_col] = None

        if move.is_castling:
            if move.to_col == 6:
                rook_from = (move.from_row, 7)
                rook_to = (move.from_row, 5)
            else:
                rook_from = (move.from_row, 0)
                rook_to = (move.from_row, 3)
            rook = self.board[rook_from[0]][rook_from[1]]
            self.board[rook_from[0]][rook_from[1]] = None
            self.board[rook_to[0]][rook_to[1]] = rook

        placed_piece = piece
        if move.promotion:
            placed_piece = move.promotion.upper() if mover == WHITE else move.promotion.lower()
        self.board[move.to_row][move.to_col] = placed_piece

        self._update_castling_rights(piece, move, target)

        if piece.upper() == "P" and abs(move.to_row - move.from_row) == 2:
            skipped_row = (move.to_row + move.from_row) // 2
            self.en_passant_target = fen.coords_to_algebraic(skipped_row, move.from_col)
        else:
            self.en_passant_target = "-"

        if piece.upper() == "P" or target is not None or move.is_en_passant:
            self.halfmove_clock = 0
        else:
            self.halfmove_clock += 1

        if self.active_color == BLACK:
            self.fullmove_number += 1
        self.active_color = WHITE if self.active_color == BLACK else BLACK

        if record_history:
            self.position_history.append(self.position_key())

    def is_in_check(self, color: str) -> bool:
        king_pos = self._find_king(color)
        if king_pos is None:
            return False
        return self.is_square_attacked(king_pos[0], king_pos[1], self._opponent(color))

    def is_checkmate(self) -> bool:
        return self.is_in_check(self.active_color) and not self.legal_moves()

    def is_stalemate(self) -> bool:
        return not self.is_in_check(self.active_color) and not self.legal_moves()

    def is_draw(self) -> bool:
        return (
            self.is_stalemate()
            or self.halfmove_clock >= 100
            or self.is_threefold_repetition()
            or self.is_insufficient_material()
        )

    def is_threefold_repetition(self) -> bool:
        current = self.position_key()
        return self.position_history.count(current) >= 3

    def is_insufficient_material(self) -> bool:
        pieces = []
        for row in self.board:
            for piece in row:
                if piece:
                    pieces.append(piece)

        stripped = [p.upper() for p in pieces if p.upper() != "K"]
        if not stripped:
            return True
        if stripped in (["B"], ["N"]):
            return True
        if sorted(stripped) == ["B", "B"]:
            bishops = self._bishop_colors()
            return len(bishops) == 2 and bishops[0] == bishops[1]
        return False

    def winner(self) -> Optional[str]:
        if self.is_checkmate():
            return self._opponent(self.active_color)
        return None

    def square_name_moves(self) -> list[str]:
        return [move.uci() for move in self.legal_moves()]

    def find_legal_move(self, uci_text: str) -> Optional[Move]:
        for move in self.legal_moves():
            if move.uci() == uci_text:
                return move
        return None

    def _piece_moves(self, row: int, col: int, piece: str) -> Iterable[Move]:
        piece_type = piece.upper()
        if piece_type == "P":
            yield from self._pawn_moves(row, col, piece)
        elif piece_type in {"N", "K"}:
            for dr, dc in PIECE_DIRECTIONS[piece_type]:
                r, c = row + dr, col + dc
                if self._inside(r, c) and not self._is_friendly(r, c, piece):
                    yield Move(row, col, r, c)
            if piece_type == "K":
                yield from self._castling_moves(row, col, piece)
        else:
            for dr, dc in PIECE_DIRECTIONS[piece_type]:
                r, c = row + dr, col + dc
                while self._inside(r, c):
                    if self._is_friendly(r, c, piece):
                        break
                    yield Move(row, col, r, c)
                    if self.board[r][c] is not None:
                        break
                    r += dr
                    c += dc

    def _pawn_moves(self, row: int, col: int, piece: str) -> Iterable[Move]:
        direction = -1 if self._color_of(piece) == WHITE else 1
        start_row = 6 if self._color_of(piece) == WHITE else 1
        promotion_row = 0 if self._color_of(piece) == WHITE else 7

        one_step = row + direction
        if self._inside(one_step, col) and self.board[one_step][col] is None:
            if one_step == promotion_row:
                for promotion in "QRBN":
                    yield Move(row, col, one_step, col, promotion=promotion)
            else:
                yield Move(row, col, one_step, col)
            two_step = row + (2 * direction)
            if row == start_row and self.board[two_step][col] is None:
                yield Move(row, col, two_step, col)

        for dc in (-1, 1):
            capture_col = col + dc
            capture_row = row + direction
            if not self._inside(capture_row, capture_col):
                continue
            target = self.board[capture_row][capture_col]
            if target is not None and self._color_of(target) != self._color_of(piece):
                if capture_row == promotion_row:
                    for promotion in "QRBN":
                        yield Move(row, col, capture_row, capture_col, promotion=promotion)
                else:
                    yield Move(row, col, capture_row, capture_col)

        if self.en_passant_target != "-":
            ep_row, ep_col = fen.algebraic_to_coords(self.en_passant_target)
            if ep_row == row + direction and abs(ep_col - col) == 1:
                yield Move(row, col, ep_row, ep_col, is_en_passant=True)

    def _castling_moves(self, row: int, col: int, piece: str) -> Iterable[Move]:
        color = self._color_of(piece)
        if self.is_in_check(color):
            return

        if color == WHITE:
            kingside = "K"
            queenside = "Q"
            home_row = 7
        else:
            kingside = "k"
            queenside = "q"
            home_row = 0

        if row != home_row or col != 4:
            return

        if kingside in self.castling_rights:
            if (
                self.board[home_row][5] is None
                and self.board[home_row][6] is None
                and not self.is_square_attacked(home_row, 5, self._opponent(color))
                and not self.is_square_attacked(home_row, 6, self._opponent(color))
            ):
                yield Move(row, col, home_row, 6, is_castling=True)

        if queenside in self.castling_rights:
            if (
                self.board[home_row][1] is None
                and self.board[home_row][2] is None
                and self.board[home_row][3] is None
                and not self.is_square_attacked(home_row, 3, self._opponent(color))
                and not self.is_square_attacked(home_row, 2, self._opponent(color))
            ):
                yield Move(row, col, home_row, 2, is_castling=True)

    def is_square_attacked(self, row: int, col: int, by_color: str) -> bool:
        pawn_direction = -1 if by_color == BLACK else 1
        for dc in (-1, 1):
            r, c = row + pawn_direction, col + dc
            if self._inside(r, c):
                piece = self.board[r][c]
                if piece and piece.upper() == "P" and self._color_of(piece) == by_color:
                    return True

        for dr, dc in PIECE_DIRECTIONS["N"]:
            r, c = row + dr, col + dc
            if self._inside(r, c):
                piece = self.board[r][c]
                if piece and piece.upper() == "N" and self._color_of(piece) == by_color:
                    return True

        for piece_type in ("B", "R", "Q"):
            for dr, dc in PIECE_DIRECTIONS[piece_type]:
                r, c = row + dr, col + dc
                while self._inside(r, c):
                    piece = self.board[r][c]
                    if piece:
                        if self._color_of(piece) == by_color and piece.upper() in {piece_type, "Q"}:
                            return True
                        break
                    r += dr
                    c += dc

        for dr, dc in PIECE_DIRECTIONS["K"]:
            r, c = row + dr, col + dc
            if self._inside(r, c):
                piece = self.board[r][c]
                if piece and piece.upper() == "K" and self._color_of(piece) == by_color:
                    return True
        return False

    def _find_king(self, color: str) -> Optional[tuple[int, int]]:
        king = "K" if color == WHITE else "k"
        for row in range(8):
            for col in range(8):
                if self.board[row][col] == king:
                    return row, col
        return None

    def _update_castling_rights(self, piece: str, move: Move, captured: Optional[str]) -> None:
        rights = set(self.castling_rights)
        from_square = fen.coords_to_algebraic(move.from_row, move.from_col)
        to_square = fen.coords_to_algebraic(move.to_row, move.to_col)

        if piece == "K":
            rights -= {"K", "Q"}
        elif piece == "k":
            rights -= {"k", "q"}
        elif piece == "R":
            if from_square == "h1":
                rights.discard("K")
            elif from_square == "a1":
                rights.discard("Q")
        elif piece == "r":
            if from_square == "h8":
                rights.discard("k")
            elif from_square == "a8":
                rights.discard("q")

        if captured == "R":
            if to_square == "h1":
                rights.discard("K")
            elif to_square == "a1":
                rights.discard("Q")
        elif captured == "r":
            if to_square == "h8":
                rights.discard("k")
            elif to_square == "a8":
                rights.discard("q")

        self.castling_rights = "".join(ch for ch in "KQkq" if ch in rights)

    def _color_of(self, piece: str) -> str:
        return WHITE if piece.isupper() else BLACK

    def _opponent(self, color: str) -> str:
        return BLACK if color == WHITE else WHITE

    def _inside(self, row: int, col: int) -> bool:
        return 0 <= row < 8 and 0 <= col < 8

    def _is_friendly(self, row: int, col: int, piece: str) -> bool:
        target = self.board[row][col]
        return target is not None and self._color_of(target) == self._color_of(piece)

    def _bishop_colors(self) -> list[int]:
        colors = []
        for row in range(8):
            for col in range(8):
                piece = self.board[row][col]
                if piece and piece.upper() == "B":
                    colors.append((row + col) % 2)
        return colors
