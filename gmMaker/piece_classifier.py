from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from fen import BoardMatrix


@dataclass
class ClassificationResult:
    board: BoardMatrix
    confidence: float
    message: str


class PieceClassifier:
    """
    A deliberately simple template-based classifier shell.

    The default implementation is conservative:
    - if OpenCV is missing, it returns an empty board
    - if OpenCV is present, it performs occupancy checks and leaves
      piece identity as a future improvement point

    The UI lets users override the detected FEN manually, which keeps the
    app useful while the vision pipeline is still being tuned.
    """

    def classify(self, image_path: str, board_bounds: tuple[int, int, int, int]) -> ClassificationResult:
        try:
            import cv2  # type: ignore
        except ImportError:
            empty_board: BoardMatrix = [[None for _ in range(8)] for _ in range(8)]
            return ClassificationResult(
                board=empty_board,
                confidence=0.0,
                message="OpenCV not installed; returning an empty board placeholder.",
            )

        image = cv2.imread(str(image_path))
        if image is None:
            empty_board = [[None for _ in range(8)] for _ in range(8)]
            return ClassificationResult(
                board=empty_board,
                confidence=0.0,
                message="Unable to read board image.",
            )

        x, y, w, h = board_bounds
        if w == 0 or h == 0:
            h, w = image.shape[:2]
            x = 0
            y = 0
        board_image = image[y : y + h, x : x + w]
        square_h = h // 8
        square_w = w // 8

        result: BoardMatrix = [[None for _ in range(8)] for _ in range(8)]
        occupied = 0
        for row in range(8):
            for col in range(8):
                square = board_image[row * square_h : (row + 1) * square_h, col * square_w : (col + 1) * square_w]
                if square.size == 0:
                    continue
                gray = cv2.cvtColor(square, cv2.COLOR_BGR2GRAY)
                edges = cv2.Canny(gray, 80, 160)
                edge_ratio = edges.mean() / 255.0
                if edge_ratio > 0.12:
                    occupied += 1
                    # Piece identity is intentionally left simple for now.
                    result[row][col] = "P" if row > 3 else "p"

        confidence = min(1.0, occupied / 16.0) if occupied else 0.1
        return ClassificationResult(
            board=result,
            confidence=confidence,
            message="Basic occupancy classifier ran. Manual FEN correction is usually still needed.",
        )
