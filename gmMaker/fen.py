from __future__ import annotations

from typing import List, Optional


BoardMatrix = List[List[Optional[str]]]


def parse_board_fen(board_part: str) -> BoardMatrix:
    rows = board_part.split("/")
    if len(rows) != 8:
        raise ValueError("FEN board must contain 8 ranks")

    board: BoardMatrix = []
    for row in rows:
        parsed_row: List[Optional[str]] = []
        for char in row:
            if char.isdigit():
                parsed_row.extend([None] * int(char))
            else:
                parsed_row.append(char)
        if len(parsed_row) != 8:
            raise ValueError("Each FEN rank must contain 8 files")
        board.append(parsed_row)
    return board


def board_to_fen(board: BoardMatrix) -> str:
    ranks = []
    for row in board:
        empty = 0
        fen_row = []
        for piece in row:
            if piece is None:
                empty += 1
                continue
            if empty:
                fen_row.append(str(empty))
                empty = 0
            fen_row.append(piece)
        if empty:
            fen_row.append(str(empty))
        ranks.append("".join(fen_row))
    return "/".join(ranks)


def parse_fen(fen: str) -> dict:
    parts = fen.strip().split()
    if len(parts) != 6:
        raise ValueError("FEN must contain 6 space-separated fields")

    board_part, active, castling, en_passant, halfmove, fullmove = parts
    if active not in {"w", "b"}:
        raise ValueError("Active color must be 'w' or 'b'")
    if castling != "-" and not set(castling) <= set("KQkq"):
        raise ValueError("Invalid castling rights")
    if en_passant != "-" and not _is_square_name(en_passant):
        raise ValueError("Invalid en passant square")

    return {
        "board": parse_board_fen(board_part),
        "active": active,
        "castling": castling,
        "en_passant": en_passant,
        "halfmove": int(halfmove),
        "fullmove": int(fullmove),
    }


def build_fen(
    board: BoardMatrix,
    active: str,
    castling: str,
    en_passant: str,
    halfmove: int,
    fullmove: int,
) -> str:
    castling_text = castling if castling else "-"
    return (
        f"{board_to_fen(board)} {active} {castling_text} "
        f"{en_passant} {halfmove} {fullmove}"
    )


def algebraic_to_coords(square: str) -> tuple[int, int]:
    if not _is_square_name(square):
        raise ValueError(f"Invalid square: {square}")
    file_index = ord(square[0]) - ord("a")
    rank_index = 8 - int(square[1])
    return rank_index, file_index


def coords_to_algebraic(row: int, col: int) -> str:
    return f"{chr(ord('a') + col)}{8 - row}"


def _is_square_name(value: str) -> bool:
    return len(value) == 2 and value[0] in "abcdefgh" and value[1] in "12345678"
