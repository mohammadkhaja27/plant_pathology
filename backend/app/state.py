"""Global application state container.

Decoupled from app.main to prevent circular import errors between main and API route modules.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.config import Settings
    from app.database import Database
    from app.ml.torch_classifier import TorchClassifier
    from app.services.disease_service import DiseaseService
    from app.services.prediction_service import PredictionService


class AppState:
    settings: Any | None = None
    classifier: Any | None = None
    prediction_service: Any | None = None
    disease_service: Any | None = None
    database: Any | None = None
