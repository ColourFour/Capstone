import unittest

from rules import Board, INITIAL_FEN


class RulesTests(unittest.TestCase):
    def test_initial_position_has_20_legal_moves(self) -> None:
        board = Board.from_fen(INITIAL_FEN)
        self.assertEqual(len(board.legal_moves()), 20)

    def test_en_passant_is_generated(self) -> None:
        board = Board.from_fen("rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3")
        self.assertIn("e5d6", board.square_name_moves())

    def test_castling_is_generated(self) -> None:
        board = Board.from_fen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")
        moves = board.square_name_moves()
        self.assertIn("e1g1", moves)
        self.assertIn("e1c1", moves)

    def test_checkmate_detection(self) -> None:
        board = Board.from_fen("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1")
        self.assertTrue(board.is_checkmate())
        self.assertEqual(board.winner(), "w")

    def test_stalemate_detection(self) -> None:
        board = Board.from_fen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")
        self.assertTrue(board.is_stalemate())
        self.assertTrue(board.is_draw())


if __name__ == "__main__":
    unittest.main()
