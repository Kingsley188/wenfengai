
import asyncio
import sys
from pathlib import Path
import logging

# Setup paths
sys.path.append("/Users/xiongshuhong/wenfengAI/backend")

from database import SessionLocal
from models import PPT
from notebooklm import NotebookLMClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def sync_task(title_to_find: str):
    logger.info(f"Looking for task with title: {title_to_find}")
    
    # 1. Find the task in local DB
    db = SessionLocal()
    task = db.query(PPT).filter(PPT.title == title_to_find).order_by(PPT.created_at.desc()).first()
    
    if not task:
        logger.error("No task found in database with that title")
        return

    logger.info(f"Found local task: {task.id}, Status: {task.status}")
    
    # 2. Search in NotebookLM
    async with await NotebookLMClient.from_storage() as client:
        notebooks = await client.notebooks.list()
        
        target_nb = None
        for nb in notebooks:
            if nb.title == title_to_find:
                target_nb = nb
                break
        
        if not target_nb:
            logger.error("No matching notebook found in NotebookLM")
            return
            
        logger.info(f"Found matching NotebookLM project: {target_nb.id}")
        
        # 3. Check artifacts
        artifacts = await client.artifacts.list(target_nb.id)
        
        pdf_url = None
        for art in artifacts:
            # Check for generic 'report' or 'slide_deck' type logic roughly
            # But the client library objects should have properties
            # Wait, api.artifacts.list returns Artifact objects?
            # Let's verify what list returns. It returns a list of Artifact objects.
            
            # Debug object structure
            # logger.info(f"Artifact dir: {dir(art)}")
            # Based on library inspection or simple check:
            # It seems 'type' is not the attribute name.
            # Let's inspect it.
            # logger.info(f"Found artifact: {art.title} ({art}) Status: {art.status}")
            
            # Since we can't easily see it without running, let's just use what we know from _artifacts.py
            # But wait, list returns [Artifact(...), ...]
            # Let's try to print the object itself to see representation
            # Print detailed info for each artifact
            logger.info(f"Checking artifact: Title='{art.title}', ID='{art.id}', Type='{art.artifact_type}', Status='{art.status_str}', URL='{art.url}'")
            
            
            # Debug object structure
            logger.info(f"Artifact dir: {dir(art)}")
            # logger.info(f"Artifact dict: {art.__dict__}")

            # Try to identify slide deck by title keywords or type if available
            # Note: NotebookLM often names decks "Slide Deck" or "Deck" or uses the topic title.
            # We will try to download IF it looks like a slide deck OR if it's a completed artifact that is NOT a source.
            
            # Let's inspect properties we can use. The library implementation of Artifact class:
            # It likely maps raw RPC list indices to properties.
            
            # Type 8 seems to be the Slide Deck / Presentation type based on user feedback and icon.
            # Title 'Strategy Review Action Plan' is also a strong indicator.
            if str(art.artifact_type) == "8" or "Strategy Review Action Plan" in art.title:
                logger.info(f"Identified likely PPT artifact: {art.title} (Type: {art.artifact_type})")
                
                # Need to get PDF URL. 
                # The library helper download_slide_deck uses internal logic to find URL.
                # But here we just want the URL string if possible, OR we download it locally.
                
                # The Result.tsx expects a URL.
                # If we download it, we need to serve it.
                # Currently Result.tsx logic:
                # result_pdf_url: data.result_url && data.result_url.startsWith('http') ? data.result_url : `${apiUrl}${data.result_url}`
                
                # Let's try to download it to static/output/{task.id}.pdf
                output_dir = Path("../static/output")
                output_dir.mkdir(exist_ok=True, parents=True)
                output_path = output_dir / f"{task.id}.pdf"
                
                logger.info(f"Downloading to {output_path}...")
                try:
                    # Use generic download_slide_deck but pass this artifact ID
                    await client.artifacts.download_slide_deck(target_nb.id, str(output_path), artifact_id=art.id)
                    pdf_url = f"/static/output/{task.id}.pdf"
                    logger.info("Download success!")
                    break
                except Exception as e:
                    logger.error(f"Download failed: {e}")

        if pdf_url:
            task.status = "completed"
            task.progress = 100
            task.result_url = pdf_url
            task.error_message = None
            db.commit()
            logger.info(f"SUCCESS: Task {task.id} updated with URL {pdf_url}")
        else:
            logger.warning("No completed slide deck found in the notebook.")

if __name__ == "__main__":
    asyncio.run(sync_task("test"))
