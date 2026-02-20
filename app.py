from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import requests
import uvicorn
import base64
import urllib.parse
import json
import re

app = FastAPI()

POLLINATIONS_TEXT_URL = "https://text.pollinations.ai/"
POLLINATIONS_IMAGE_URL = "https://image.pollinations.ai/prompt/"


class EnhanceRequest(BaseModel):
    prompt: str
    width: int = 1024
    height: int = 768


class StageRequest(BaseModel):
    room_type: str
    style: str
    width: int = 1024
    height: int = 768


@app.post("/api/analyze")
async def analyze_image(image: UploadFile = File(...)):
    """Analyze a property image and return enhancement suggestions."""
    try:
        contents = await image.read()
        b64_image = base64.b64encode(contents).decode("utf-8")
        mime = image.content_type or "image/jpeg"

        prompt = (
            "You are an expert real estate photographer and image analyst. "
            "Analyze this property image and provide a JSON response with exactly this structure:\n"
            '{\n'
            '  "issues": ["list of detected issues like poor lighting, clutter, empty rooms, bad angles"],\n'
            '  "suggestions": {\n'
            '    "lighting": "specific lighting correction advice",\n'
            '    "removal": "objects that should be removed for cleaner listing",\n'
            '    "staging": "virtual staging recommendations"\n'
            '  },\n'
            '  "enhance_prompt": "A detailed prompt to generate an enhanced version of this property photo with professional real estate photography quality, corrected lighting, clean composition",\n'
            '  "room_type": "detected room type (living room, bedroom, kitchen, bathroom, exterior, etc)",\n'
            '  "quality_score": 65\n'
            '}\n'
            "Respond ONLY with valid JSON, no extra text."
        )

        payload = {
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime};base64,{b64_image}"
                            },
                        },
                    ],
                }
            ],
            "model": "openai",
            "jsonMode": True,
        }

        response = requests.post(POLLINATIONS_TEXT_URL, json=payload, timeout=90)

        if response.status_code == 200:
            text = response.text.strip()
            # Try to extract JSON from the response
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                # Try to find JSON in the response
                match = re.search(r'\{[\s\S]*\}', text)
                if match:
                    data = json.loads(match.group())
                else:
                    data = {
                        "issues": ["Unable to fully analyze \u2014 try a clearer image"],
                        "suggestions": {
                            "lighting": "Increase natural light or add warm fill lighting",
                            "removal": "Remove personal items and clutter",
                            "staging": "Add modern furniture and decor"
                        },
                        "enhance_prompt": "Professional real estate photo of a well-lit, clean, modern interior with warm lighting and elegant staging",
                        "room_type": "interior",
                        "quality_score": 50
                    }
            return JSONResponse(content=data)
        else:
            raise HTTPException(status_code=500, detail="AI analysis service unavailable")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/enhance")
async def enhance_image(request: EnhanceRequest):
    """Generate an AI-enhanced version of the property image."""
    try:
        encoded_prompt = urllib.parse.quote(request.prompt)
        image_url = (
            f"{POLLINATIONS_IMAGE_URL}{encoded_prompt}"
            f"?width={request.width}&height={request.height}&nologo=true&seed={hash(request.prompt) % 10000}"
        )

        # Verify the image URL is accessible
        head_resp = requests.head(image_url, timeout=10, allow_redirects=True)
        if head_resp.status_code < 400:
            return {"image_url": image_url, "prompt": request.prompt}
        else:
            # Return URL anyway \u2014 Pollinations generates on-demand
            return {"image_url": image_url, "prompt": request.prompt}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/stage")
async def virtual_stage(request: StageRequest):
    """Generate a virtually staged room image."""
    try:
        staging_prompt = (
            f"Professional real estate listing photo of a beautifully staged {request.room_type}, "
            f"{request.style} interior design style, warm natural lighting, "
            f"high-end furniture and decor, magazine quality photography, "
            f"8k ultra detailed, architectural digest style, "
            f"photorealistic, no people, clean composition"
        )

        encoded_prompt = urllib.parse.quote(staging_prompt)
        image_url = (
            f"{POLLINATIONS_IMAGE_URL}{encoded_prompt}"
            f"?width={request.width}&height={request.height}&nologo=true&seed={hash(staging_prompt) % 10000}"
        )

        return {
            "image_url": image_url,
            "prompt": staging_prompt,
            "room_type": request.room_type,
            "style": request.style,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Serve static files
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
