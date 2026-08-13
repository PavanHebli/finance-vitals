import base64
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from models import SnapshotEncodeRequest
from core.storage import create_snapshot, load_vit_bytes, append_or_overwrite, to_vit

router = APIRouter()


@router.post("/snapshot/encode")
def snapshot_encode(req: SnapshotEncodeRequest):
    """Creates a .vit snapshot and returns encrypted bytes as base64."""
    state = req.form_data.model_dump()
    snap  = create_snapshot(
        state=state,
        metrics=req.metrics.model_dump(),
        metric_scores=req.metric_scores.model_dump(),
        overall_score=req.overall_score,
        mirror=req.mirror.model_dump(),
        narrative=req.narrative,
        goal=req.goal,
    )
    # Load existing snapshots if any were passed (future: pass existing base64)
    vit_bytes = to_vit([snap])
    return {"vit_b64": base64.b64encode(vit_bytes).decode()}


@router.post("/snapshot/decode")
async def snapshot_decode(file: UploadFile = File(...)):
    """Decrypts an uploaded .vit file and returns the snapshots list."""
    data = await file.read()
    try:
        snapshots = load_vit_bytes(data)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return {"snapshots": snapshots}


@router.post("/snapshot/append")
async def snapshot_append(req: SnapshotEncodeRequest, file: UploadFile = File(None)):
    """Appends a new snapshot to an existing .vit file (or creates new if no file)."""
    state = req.form_data.model_dump()
    snap  = create_snapshot(
        state=state,
        metrics=req.metrics.model_dump(),
        metric_scores=req.metric_scores.model_dump(),
        overall_score=req.overall_score,
        mirror=req.mirror.model_dump(),
        narrative=req.narrative,
        goal=req.goal,
    )

    existing = []
    if file:
        data = await file.read()
        try:
            existing = load_vit_bytes(data)
        except ValueError:
            pass

    updated   = append_or_overwrite(existing, snap)
    vit_bytes = to_vit(updated)
    return Response(
        content=vit_bytes,
        media_type="application/octet-stream",
        headers={"Content-Disposition": "attachment; filename=my_vitals.vit"},
    )
