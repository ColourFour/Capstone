from __future__ import annotations

import json
import subprocess
import tempfile
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional


APP_DIR = Path(".app_state")
APP_DIR.mkdir(exist_ok=True)
REGION_FILE = APP_DIR / "region.json"


@dataclass
class CaptureRegion:
    x: int
    y: int
    width: int
    height: int

    def as_screencapture_arg(self) -> str:
        return f"{self.x},{self.y},{self.width},{self.height}"


def save_region(region: CaptureRegion) -> None:
    REGION_FILE.write_text(json.dumps(asdict(region), indent=2))


def load_region() -> Optional[CaptureRegion]:
    if not REGION_FILE.exists():
        return None
    data = json.loads(REGION_FILE.read_text())
    return CaptureRegion(**data)


def capture_fullscreen(output_path: Optional[Path] = None) -> Path:
    target = output_path or Path(tempfile.gettempdir()) / "chess_fullscreen.png"
    subprocess.run(["screencapture", "-x", str(target)], check=True)
    return target


def capture_region(region: CaptureRegion, output_path: Optional[Path] = None) -> Path:
    target = output_path or Path(tempfile.gettempdir()) / "chess_region.png"
    subprocess.run(
        ["screencapture", "-x", f"-R{region.as_screencapture_arg()}", str(target)],
        check=True,
    )
    return target


def ensure_region() -> CaptureRegion:
    region = load_region()
    if region is None:
        raise RuntimeError("No capture region selected yet")
    return region
