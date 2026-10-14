#!/usr/bin/env python3
"""Compose hybrid demo: live app UI + narrated storyboard slides."""

from __future__ import annotations

import asyncio
import json
import shutil
import subprocess
from pathlib import Path

import edge_tts
from PIL import Image, ImageDraw, ImageFont

OUT = Path("/opt/cursor/artifacts/videos")
WORK = Path("/tmp/nonapay-hybrid")
LIVE_HOME = OUT / "live-app-home.mp4"
VOICE = "en-NG-EzinneNeural"
W, H = 1920, 1080

BG0, BG1 = (6, 20, 16), (12, 36, 32)
FOAM, MIST, MINT = (231, 247, 240), (168, 207, 192), (61, 220, 151)


def font(size: int, bold: bool = False):
    path = (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    )
    return ImageFont.truetype(path, size)


def gradient():
    img = Image.new("RGB", (W, H), BG0)
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        r = int(BG0[0] * (1 - t) + BG1[0] * t)
        g = int(BG0[1] * (1 - t) + BG1[1] * t)
        b = int(BG0[2] * (1 - t) + BG1[2] * t)
        for x in range(W):
            wash = max(0.0, 1.0 - ((x / W) ** 2 + (y / H) ** 2) * 1.4) * 0.22
            px[x, y] = (
                min(255, int(r + MINT[0] * wash)),
                min(255, int(g + MINT[1] * wash)),
                min(255, int(b + MINT[2] * wash)),
            )
    return img


def slide(kicker: str, title: str, body: str, points: list[str] | None = None) -> Image.Image:
    img = gradient()
    d = ImageDraw.Draw(img)
    d.text((96, 64), "NONAPAY · LIVE DEMO", font=font(22, True), fill=MINT)
    y = 180
    d.text((96, y), kicker.upper(), font=font(28, True), fill=MINT)
    y += 70
    d.text((96, y), title, font=font(64, True), fill=FOAM)
    y += 100
    import textwrap

    for line in textwrap.wrap(body, 56):
        d.text((96, y), line, font=font(34), fill=MIST)
        y += 46
    if points:
        y += 30
        for p in points:
            d.text((96, y), "•  " + p, font=font(30), fill=FOAM)
            y += 48
    return img


async def tts(text: str, path: Path) -> float:
    await edge_tts.Communicate(text, VOICE).save(str(path))
    probe = json.loads(
        subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)],
            text=True,
        )
    )
    return float(probe["format"]["duration"])


def img_clip(png: Path, audio: Path, out: Path, extra: float = 0.4):
    dur = float(
        json.loads(
            subprocess.check_output(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(audio)],
                text=True,
            )
        )["format"]["duration"]
    )
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(png),
            "-i",
            str(audio),
            "-c:v",
            "libx264",
            "-tune",
            "stillimage",
            "-c:a",
            "aac",
            "-pix_fmt",
            "yuv420p",
            "-shortest",
            "-t",
            f"{dur + extra:.3f}",
            "-vf",
            "scale=1920:1080",
            "-r",
            "30",
            str(out),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def scale_live(src: Path, out: Path, narration: Path):
    """Loop/trim live clip to narration length, scale 1920x1080, mix audio."""
    ndur = float(
        json.loads(
            subprocess.check_output(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(narration)],
                text=True,
            )
        )["format"]["duration"]
    )
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-stream_loop",
            "-1",
            "-i",
            str(src),
            "-i",
            str(narration),
            "-t",
            f"{ndur + 0.5:.3f}",
            "-vf",
            "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1",
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-shortest",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            str(out),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


async def main():
    if WORK.exists():
        shutil.rmtree(WORK)
    WORK.mkdir(parents=True)

    clips: list[Path] = []

    # 1 live home
    a0 = WORK / "a0.mp3"
    await tts(
        "NonaPay live on Monad Testnet. Open the app — create a Mera passkey. No seed phrase. No wallet extension.",
        a0,
    )
    c0 = WORK / "c0.mp4"
    scale_live(LIVE_HOME, c0, a0)
    clips.append(c0)

    story = [
        (
            "Step 2",
            "Claim handle + verify phone",
            "On Me, claim your handle and verify a phone number once per passkey. That OTP becomes CRE criteria.",
            ["@handle claim", "Phone OTP once per passkey"],
            "Step two: claim your handle and verify a phone number. The OTP attestation is what CRE will check.",
        ),
        (
            "Step 3",
            "Drip test funds",
            "In-app drip fills MON gas and Agora AUSD so you can send without leaving the demo.",
            ["MON for gas", "Agora AUSD to send"],
            "Step three: drip test MON and Agora AUSD into the passkey wallet.",
        ),
        (
            "Step 4",
            "Send to @alice",
            "Cash App-like keypad. Pay locks AUSD in dual-exit escrow and emits PaymentOpened for CRE.",
            ["Lock via NonaGateway", "PaymentOpened → CRE"],
            "Step four: send to at-alice. Pay locks AUSD in escrow and opens the payment for Chainlink CRE.",
        ),
        (
            "Step 5",
            "CRE settles — or reclaim",
            "CRE verifies the HMAC attestation in a TEE, then writeReport releases. Silence means fifteen-minute reclaim.",
            ["TEE HMAC verify", "writeReport → release", "15m dual-exit reclaim"],
            "Step five: CRE verifies the attestation in a TEE and releases. If criteria never land, the payer reclaims in fifteen minutes.",
        ),
    ]

    for i, (k, t, b, pts, n) in enumerate(story, start=1):
        png = WORK / f"s{i}.png"
        slide(k, t, b, pts).save(png)
        audio = WORK / f"a{i}.mp3"
        await tts(n, audio)
        clip = WORK / f"c{i}.mp4"
        img_clip(png, audio, clip)
        clips.append(clip)

    # end on live UI again
    a_end = WORK / "a_end.mp3"
    await tts(
        "Try it at nonad-pay.vercel.app. Passkey in. Send dollars to a handle. CRE unlocks the escrow.",
        a_end,
    )
    c_end = WORK / "c_end.mp4"
    scale_live(LIVE_HOME, c_end, a_end)
    clips.append(c_end)

    lst = WORK / "list.txt"
    lst.write_text("\n".join(f"file '{c}'" for c in clips) + "\n")
    out = OUT / "nonapay-demo.mp4"
    subprocess.check_call(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(out)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    dur = float(
        json.loads(
            subprocess.check_output(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(out)],
                text=True,
            )
        )["format"]["duration"]
    )
    print(f"OK {out} ({dur:.1f}s)")


if __name__ == "__main__":
    asyncio.run(main())
