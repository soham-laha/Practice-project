from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Exam = Literal["main", "advanced"]
Model = Literal["gemini-flash-latest", "gemini-flash-lite-latest"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_max_length=8000, allow_inf_nan=False)


class Recovery(StrictModel):
    question: str = Field(min_length=5, max_length=1000)
    answer: str = Field(min_length=1, max_length=300)
    expression: str = Field(min_length=1, max_length=300)
    target_expression: str = Field(min_length=1, max_length=300)
    explanation: str = Field(min_length=3, max_length=1000)


class Trap(StrictModel):
    label: str = Field(min_length=2, max_length=100)
    why_plausible: str = Field(min_length=8, max_length=1200)
    first_wrong_pivot: str = Field(min_length=8, max_length=1200)
    counterfactual_valid_when: str = Field(min_length=8, max_length=1200)
    avoidance_rule: str = Field(min_length=8, max_length=500)
    recovery_check: Recovery


class Option(StrictModel):
    id: str = Field(pattern=r"^[A-D]$")
    latex: str = Field(min_length=1, max_length=500)
    expression: str = Field(min_length=1, max_length=300)
    derived_expression: str = Field(min_length=1, max_length=300)
    unit: list[int] = Field(min_length=3, max_length=3, description="Mass, length, time powers")
    slope: float = Field(ge=-5, le=5)
    intercept: float = Field(ge=-10, le=10)
    trap: Trap | None


class DiagramAnchor(StrictModel):
    label: str = Field(min_length=1, max_length=80)
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    description: str = Field(min_length=1, max_length=500)


class Item(StrictModel):
    schema_version: Literal["targetjee.item.v2"] = "targetjee.item.v2"
    id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,80}$")
    exam: Exam
    subject: Literal["Physics", "Chemistry", "Mathematics"]
    topic: str = Field(min_length=2, max_length=100)
    prompt: str = Field(min_length=10, max_length=8000)
    context: str = Field(max_length=1000)
    options: list[Option] = Field(min_length=4, max_length=4)
    correct_id: str = Field(pattern=r"^[A-D]$")
    answer_expression: str = Field(min_length=1, max_length=300)
    solution: str = Field(min_length=10, max_length=4000)
    domain: dict[str, Literal["real", "positive", "nonnegative", "integer"]] = Field(max_length=8)
    expected_unit: list[int] = Field(min_length=3, max_length=3)
    diagram_anchors: list[DiagramAnchor] = Field(max_length=20)
    beta_seconds: int = Field(ge=90, le=300)
    alpha: float = Field(gt=0, le=4)
    a: float = Field(gt=0, le=4)
    b: float = Field(ge=-3, le=3)
    c: float = Field(ge=0, lt=1)
    positive_marks: Literal[4] = 4
    negative_marks: Literal[1, 2]
    parameter_source: Literal["illustrative", "model-proposed"]

    @model_validator(mode="after")
    def valid_contract(self):
        if {o.id for o in self.options} != set("ABCD"):
            raise ValueError("Unique A–D option IDs required")
        if sum(o.trap is None for o in self.options) != 1:
            raise ValueError("Exactly one keyed answer and three trap traces required")
        for o in self.options:
            if (o.id == self.correct_id) != (o.trap is None):
                raise ValueError("Key and trap trace mismatch")
        low, high = (90, 180) if self.exam == "main" else (180, 300)
        if not low <= self.beta_seconds <= high or (
            self.exam == "main" and self.negative_marks != 1
        ):
            raise ValueError("Exam pacing or marking scheme mismatch")
        return self


class ExtractionResult(StrictModel):
    # The source for the supported-keyword provider schema projection. Final
    # Pydantic and isolated algebra checks are independent; JSON is no proof.
    items: list[Item] = Field(min_length=1, max_length=10)


class ExtractionRequest(StrictModel):
    text: str = Field(min_length=10, max_length=30000)
    exam: Exam = "main"
    model: Model = "gemini-flash-latest"


class CoachRequest(StrictModel):
    message: str = Field(min_length=1, max_length=2000)
    context: str = Field(max_length=8000)
    model: Model = "gemini-flash-latest"
    exam: Exam = "main"


class ValidationRequest(StrictModel):
    items: list[Item] = Field(min_length=1, max_length=10)
