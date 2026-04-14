from __future__ import annotations

import ctypes
import time
from dataclasses import dataclass


try:
    APPLICATION_SERVICES = ctypes.cdll.LoadLibrary(
        "/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices"
    )
except OSError:
    APPLICATION_SERVICES = None


@dataclass
class ScreenPoint:
    x: float
    y: float


class CGPoint(ctypes.Structure):
    _fields_ = [("x", ctypes.c_double), ("y", ctypes.c_double)]


def can_automate_mouse() -> bool:
    return APPLICATION_SERVICES is not None and is_accessibility_enabled()


def is_accessibility_enabled() -> bool:
    if APPLICATION_SERVICES is None:
        return False

    APPLICATION_SERVICES.AXIsProcessTrusted.restype = ctypes.c_bool
    return bool(APPLICATION_SERVICES.AXIsProcessTrusted())


def move_piece_drag(start: ScreenPoint, end: ScreenPoint, pause: float = 0.08) -> None:
    if APPLICATION_SERVICES is None:
        raise RuntimeError("Quartz mouse automation is unavailable on this system")
    if not is_accessibility_enabled():
        raise RuntimeError(
            "Mouse automation requires macOS Accessibility permission for your Python process"
        )

    _mouse_event(5, start)  # move
    time.sleep(pause)
    _mouse_event(1, start)  # down
    time.sleep(pause)
    _mouse_event(6, end)  # dragged
    time.sleep(pause)
    _mouse_event(2, end)  # up


def _mouse_event(event_type: int, point: ScreenPoint) -> None:
    APPLICATION_SERVICES.CGEventCreateMouseEvent.restype = ctypes.c_void_p
    APPLICATION_SERVICES.CGEventCreateMouseEvent.argtypes = [
        ctypes.c_void_p,
        ctypes.c_uint32,
        CGPoint,
        ctypes.c_uint32,
    ]
    APPLICATION_SERVICES.CGEventPost.argtypes = [ctypes.c_uint32, ctypes.c_void_p]
    APPLICATION_SERVICES.CFRelease.argtypes = [ctypes.c_void_p]

    cg_point = CGPoint(point.x, point.y)
    event = APPLICATION_SERVICES.CGEventCreateMouseEvent(None, event_type, cg_point, 0)
    if not event:
        raise RuntimeError("Failed to create Quartz mouse event")
    APPLICATION_SERVICES.CGEventPost(0, event)
    APPLICATION_SERVICES.CFRelease(event)
