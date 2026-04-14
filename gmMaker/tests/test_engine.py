import unittest

from engine import SimpleEngine
from rules import Board


class EngineTests(unittest.TestCase):
    def test_engine_finds_mate_in_one(self) -> None:
        board = Board.from_fen("7k/5K2/6Q1/8/8/8/8/8 w - - 0 1")
        engine = SimpleEngine(max_depth=2)
        result = engine.best_move(board)
        self.assertEqual(result.move.uci(), "g6h5")


if __name__ == "__main__":
    unittest.main()
