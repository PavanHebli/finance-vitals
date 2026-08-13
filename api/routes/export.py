from fastapi import APIRouter
from fastapi.responses import Response
from models import SnapshotEncodeRequest
from core.export_pdf import generate_pdf

router = APIRouter()


class ExportPDFRequest(SnapshotEncodeRequest):
    narrative: str = ""


@router.post("/export/pdf")
def export_pdf(req: ExportPDFRequest):
    pdf_bytes = generate_pdf(
        state=req.form_data.model_dump(),
        metrics=req.metrics.model_dump(),
        metric_scores=req.metric_scores.model_dump(),
        overall_score=req.overall_score,
        mirror=req.mirror.model_dump(),
        narrative_text=req.narrative,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=vitals_report.pdf"},
    )
