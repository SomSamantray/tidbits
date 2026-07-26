import pytest

from app.postprocess import PostProcessError, to_looping_gif
from pathlib import Path


def test_gif_rejects_long_duration(tmp_path: Path):
    input_file = tmp_path / "in.mp4"
    output_file = tmp_path / "out.gif"
    input_file.write_bytes(b"fake")
    with pytest.raises(PostProcessError, match="5 seconds"):
        to_looping_gif(input_file, output_file, duration_seconds=6)
