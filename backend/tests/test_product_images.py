from pathlib import Path

import pytest

from app.core.config import Settings
from app.core.errors import ApiError
from app.products.router import product_image
from app.products.service import LocalObjectStorage


def test_product_image_path_is_limited_to_storage_root(tmp_path: Path) -> None:
    settings = Settings(_env_file=None, LOCAL_STORAGE_ROOT=str(tmp_path))
    storage = LocalObjectStorage(settings)
    image = tmp_path / "households" / "one" / "product.png"
    image.parent.mkdir(parents=True)
    image.write_bytes(b"png")

    assert storage.path_for("households/one/product.png") == image
    assert storage.path_for("../outside.png") is None
    assert storage.path_for("missing.png") is None


@pytest.mark.asyncio
async def test_product_image_route_serves_a_persisted_image(tmp_path: Path) -> None:
    settings = Settings(_env_file=None, LOCAL_STORAGE_ROOT=str(tmp_path))
    image = tmp_path / "households" / "one" / "product.png"
    image.parent.mkdir(parents=True)
    image.write_bytes(b"png")

    response = await product_image("households/one/product.png", settings)

    assert Path(response.path) == image
    assert response.media_type == "image/png"
    with pytest.raises(ApiError, match="Product image not found") as exc:
        await product_image("missing.png", settings)
    assert exc.value.status_code == 404
    assert exc.value.code == "PRODUCT_IMAGE_NOT_FOUND"
