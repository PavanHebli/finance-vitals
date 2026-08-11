from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from core.importer import run_import
from config import get_config

router = APIRouter()


@router.post("/import/pdf")
async def import_pdf(
    file: UploadFile = File(...),
    provider: str = Form(""),
    api_key: str = Form(""),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    config   = get_config()
    if not api_key:
        provider = config.hosted_provider
        api_key  = config.hosted_api_key
    elif not provider:
        provider = config.hosted_provider

    pdf_bytes = await file.read()
    result    = run_import(pdf_bytes, provider, api_key)

    if result.get("error"):
        for line in result.get("debug_log", []):
            print(f"[IMPORT DEBUG] {line}", flush=True)
        raise HTTPException(status_code=422, detail=result["error"])

    return result
