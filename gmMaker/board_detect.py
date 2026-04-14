from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class BoardDetectionResult:
    image_path: str
    board_found: bool
    board_bounds: tuple[int, int, int, int]
    orientation: str
    square_size: int
    message: str


def detect_board(image_path: str) -> BoardDetectionResult:
    """
    Keep this detector intentionally simple.

    If OpenCV is available, it looks for the largest roughly square contour.
    If not, it assumes the whole captured region is already the board.
    """
    try:
        import cv2  # type: ignore
    except ImportError:
        return BoardDetectionResult(
            image_path=image_path,
            board_found=True,
            board_bounds=(0, 0, 0, 0),
            orientation="white-bottom",
            square_size=0,
            message="OpenCV not installed; using the full capture as the board region.",
        )

    image = cv2.imread(str(image_path))
    if image is None:
        return BoardDetectionResult(
            image_path=image_path,
            board_found=False,
            board_bounds=(0, 0, 0, 0),
            orientation="unknown",
            square_size=0,
            message="Unable to read captured image.",
        )

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    best_rect: Optional[tuple[int, int, int, int]] = None
    best_area = 0
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        if area < best_area:
            continue
        ratio = w / h if h else 0
        if 0.8 <= ratio <= 1.2:
            best_area = area
            best_rect = (x, y, w, h)

    if best_rect is None:
        h, w = image.shape[:2]
        best_rect = (0, 0, w, h)
        message = "No clear board contour found; falling back to the full region."
    else:
        message = "Detected a likely chessboard region."

    square_size = max(best_rect[2], best_rect[3]) // 8
    return BoardDetectionResult(
        image_path=image_path,
        board_found=True,
        board_bounds=best_rect,
        orientation="white-bottom",
        square_size=square_size,
        message=message,
    )
