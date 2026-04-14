import unittest

import fen
from rules import Board, INITIAL_FEN


class FenTests(unittest.TestCase):
    def test_parse_and_build_round_trip(self) -> None:
        original = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        state = fen.parse_fen(original)
        rebuilt = fen.build_fen(
            state["board"],
            state["active"],
            state["castling"],
            state["en_passant"],
            state["halfmove"],
            state["fullmove"],
        )
        self.assertEqual(original, rebuilt)

    def test_board_to_fen_matches_initial_position(self) -> None:
        board = Board.from_fen(INITIAL_FEN)
        self.assertEqual(fen.board_to_fen(board.board), INITIAL_FEN.split()[0])


if __name__ == "__main__":
    unittest.main()
