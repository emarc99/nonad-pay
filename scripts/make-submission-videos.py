#!/usr/bin/env python3
"""Render Metropolis submission videos: pitch, demo, Agora, Chainlink, Mera."""

from __future__ import annotations

import asyncio
import json
import shutil
import subprocess
import textwrap
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

try:
    import edge_tts
except ImportError as e:  # pragma: no cover
    raise SystemExit("pip install edge-tts") from e

ROOT = Path("/workspace")
OUT = Path("/opt/cursor/artifacts/videos")
WORK = Path("/tmp/nonapay-videos")
LOGO = ROOT / "frontend/public/nonapay-logo.png"

W, H = 1920, 1080
BG0 = (6, 20, 16)
BG1 = (12, 36, 32)
FOAM = (231, 247, 240)
MIST = (168, 207, 192)
MINT = (61, 220, 151)
INK = (4, 18, 14)

VOICE = "en-NG-EzinneNeural"
VOICE_ALT = "en-US-AndrewNeural"


@dataclass
class Slide:
    kicker: str
    title: str
    body: str
    points: list[str] = field(default_factory=list)
    narration: str = ""
    hold_extra: float = 0.35


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def gradient_bg() -> Image.Image:
    img = Image.new("RGB", (W, H), BG0)
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        r = int(BG0[0] * (1 - t) + BG1[0] * t)
        g = int(BG0[1] * (1 - t) + BG1[1] * t)
        b = int(BG0[2] * (1 - t) + BG1[2] * t)
        for x in range(W):
            # soft mint wash top-left
            dx = x / W
            dy = y / H
            wash = max(0.0, 1.0 - (dx * dx + dy * dy) * 1.4) * 0.22
            px[x, y] = (
                min(255, int(r + MINT[0] * wash)),
                min(255, int(g + MINT[1] * wash)),
                min(255, int(b + MINT[2] * wash)),
            )
    return img


def wrap_text(text: str, max_chars: int) -> list[str]:
    return textwrap.wrap(text, width=max_chars, break_long_words=False, break_on_hyphens=False)


def draw_slide(slide: Slide, index: int, total: int, brand: str) -> Image.Image:
    img = gradient_bg()
    draw = ImageDraw.Draw(img)

    f_kicker = font(28, bold=True)
    f_title = font(72, bold=True)
    f_body = font(36)
    f_point = font(32)
    f_meta = font(22)

    # brand chip
    draw.text((96, 64), brand.upper(), font=f_meta, fill=MINT)
    draw.text((W - 220, 64), f"{index + 1} / {total}", font=f_meta, fill=MIST)

    y = 160
    draw.text((96, y), slide.kicker.upper(), font=f_kicker, fill=MINT)
    y += 64

    for line in wrap_text(slide.title, 28):
        draw.text((96, y), line, font=f_title, fill=FOAM)
        y += 84

    y += 16
    for line in wrap_text(slide.body, 58):
        draw.text((96, y), line, font=f_body, fill=MIST)
        y += 48

    if slide.points:
        y += 28
        draw.rectangle((96, y, 100, y + 24 + 48 * len(slide.points)), fill=MINT)
        y += 8
        for p in slide.points:
            for i, line in enumerate(wrap_text(p, 52)):
                prefix = "  " if i else "• "
                draw.text((128, y), prefix + line, font=f_point, fill=FOAM)
                y += 44
            y += 8

    # logo badge bottom-right
    if LOGO.exists():
        logo = Image.open(LOGO).convert("RGBA")
        logo.thumbnail((160, 160))
        # dark panel behind logo
        pad = 18
        box = (
            W - logo.width - 96 - pad,
            H - logo.height - 72 - pad,
            W - 96 + pad,
            H - 72 + pad,
        )
        panel = Image.new("RGBA", img.size, (0, 0, 0, 0))
        pd = ImageDraw.Draw(panel)
        pd.rounded_rectangle(box, radius=18, fill=(4, 18, 14, 210))
        img = Image.alpha_composite(img.convert("RGBA"), panel).convert("RGB")
        img.paste(logo.convert("RGB"), (W - logo.width - 96, H - logo.height - 72), logo.split()[-1])

    return img


async def synth(text: str, path: Path, voice: str) -> float:
    path.parent.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(str(path))
    # duration via ffprobe
    probe = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            str(path),
        ],
        text=True,
    )
    return float(json.loads(probe)["format"]["duration"])


def render_video(name: str, slides: list[Slide], voice: str = VOICE) -> Path:
    work = WORK / name
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)
    OUT.mkdir(parents=True, exist_ok=True)

    brand = "NonaPay"
    concat_lines: list[str] = []
    total_dur = 0.0

    async def all_audio() -> list[float]:
        durs: list[float] = []
        for i, s in enumerate(slides):
            narration = s.narration or f"{s.title}. {s.body}"
            durs.append(await synth(narration, work / f"a{i:02d}.mp3", voice))
        return durs

    durs = asyncio.run(all_audio())

    for i, s in enumerate(slides):
        img = draw_slide(s, i, len(slides), brand)
        png = work / f"s{i:02d}.png"
        img.save(png)

        dur = durs[i] + s.hold_extra
        total_dur += dur
        clip = work / f"c{i:02d}.mp4"
        # silent video from image + mix audio
        subprocess.check_call(
            [
                "ffmpeg",
                "-y",
                "-loop",
                "1",
                "-i",
                str(png),
                "-i",
                str(work / f"a{i:02d}.mp3"),
                "-c:v",
                "libx264",
                "-tune",
                "stillimage",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-pix_fmt",
                "yuv420p",
                "-shortest",
                "-t",
                f"{dur:.3f}",
                "-vf",
                "scale=1920:1080",
                "-r",
                "30",
                str(clip),
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        concat_lines.append(f"file '{clip}'")

    list_path = work / "list.txt"
    list_path.write_text("\n".join(concat_lines) + "\n")
    out = OUT / f"{name}.mp4"
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_path),
            "-c",
            "copy",
            str(out),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"OK {out} ({total_dur:.1f}s)")
    return out


PITCH: list[Slide] = [
    Slide(
        kicker="Metropolis · Consumer Payments",
        title="NonaPay",
        body="Cash App for AUSD remittances on Monad. Passkeys in. Handles out. Escrow that only unlocks when criteria are real.",
        narration=(
            "NonaPay. Cash App for AUSD remittances on Monad. "
            "Passkeys in. Handles out. Escrow that only unlocks when criteria are real."
        ),
    ),
    Slide(
        kicker="The problem",
        title="Sending money home is a bad choice.",
        body="Trust a remittance app to hold your funds — or go on-chain and wrestle seed phrases and wallet addresses. Neither answers: did the receiver prove it?",
        points=[
            "Web2 remits = trust the company",
            "Crypto remits = seed phrases and hex paste",
            "Watchers unlock escrow without load-bearing proof",
        ],
        narration=(
            "Sending money home still forces a bad choice. Trust a remittance app to hold and release your funds, "
            "or go on-chain and wrestle seed phrases and wallet addresses. "
            "Neither answers a simple question: did the receiver prove it — without a human watcher in the middle?"
        ),
    ),
    Slide(
        kicker="The solution",
        title="Proof without a middleman.",
        body="Cash App-like sends. AUSD locked until CRE verifies a real OTP attestation. Reclaim in 15 minutes if release never comes.",
        points=[
            "Mera passkeys — no seed phrases",
            "Chainlink CRE is the criteria engine",
            "15-minute dual-exit reclaim",
        ],
        narration=(
            "NonaPay closes that gap. Users get Cash App-like simple sends with a passkey, handle, or phone number. "
            "Agora AUSD locks in escrow until Chainlink CRE verifies a real OTP attestation in a TEE. "
            "No release? The payer reclaims in fifteen minutes. Proof without a middleman — not hope."
        ),
    ),
    Slide(
        kicker="How it works",
        title="Pay. Attest. Settle.",
        body="One path from passkey to release — on Monad Testnet and inside CRE’s confidential workflow.",
        points=[
            "openPayment locks Agora AUSD in escrow",
            "OTP → HMAC attestation on the public relay",
            "CRE verifies secrets → writeReport → release",
        ],
        narration=(
            "How it works: Pay, attest, settle. "
            "A passkey signs open payment and locks Agora AUSD. "
            "After phone OTP, the app posts a signed attestation. "
            "CRE loads Vault secrets, verifies the HMAC in a TEE, then writeReport releases — or silence triggers reclaim."
        ),
    ),
    Slide(
        kicker="Why this stack",
        title="Monad · Agora · Mera · Chainlink",
        body="Each piece carries weight — not logos for logos’ sake.",
        points=[
            "Monad — fast finality for the send UX",
            "Agora AUSD — dollar-stable settlement",
            "Mera — one passkey, many derived keys",
            "CRE — TEE criteria + DON writeReport",
        ],
        narration=(
            "Why this stack: Monad for fast finality. Agora AUSD as the dollar rail. "
            "Mera so one passkey derives master and spend keys. "
            "Chainlink CRE so criteria live in a TEE — not a fake watcher."
        ),
    ),
    Slide(
        kicker="Try it",
        title="Send dollars to a handle.",
        body="Live now: create a passkey, verify a phone number, drip test funds, pay @alice — watch CRE release.",
        narration=(
            "Try it live at nonad-pay.vercel.app. Create a passkey, verify a phone number, drip test funds, "
            "and send to at-alice. Watch CRE release — or reclaim if criteria never land. That’s NonaPay."
        ),
        hold_extra=0.8,
    ),
]

DEMO: list[Slide] = [
    Slide(
        kicker="Product demo",
        title="NonaPay end to end",
        body="Cold start to CRE release on Monad Testnet — under three minutes.",
        narration=(
            "This is the NonaPay product demo. Cold start to Chainlink CRE release on Monad Testnet."
        ),
    ),
    Slide(
        kicker="Step 1",
        title="Create a passkey",
        body="Mera WebAuthn — Face ID, Touch ID, or Google Password Manager. No seed phrase. No extension.",
        narration=(
            "Step one: create a Mera passkey. Face ID, Touch ID, or Google Password Manager. "
            "No seed phrase. No browser wallet extension."
        ),
    ),
    Slide(
        kicker="Step 2",
        title="Claim a handle + verify phone",
        body="On Me, claim your @handle and verify a Nigerian phone number once per passkey. OTP binds criteria to this identity.",
        narration=(
            "Step two: on Me, claim your handle and verify a phone number once per passkey. "
            "That OTP is the criteria material CRE will check later."
        ),
    ),
    Slide(
        kicker="Step 3",
        title="Drip test MON + AUSD",
        body="In-app drip funds the passkey wallet so you can send without hunting a faucet mid-demo.",
        narration=(
            "Step three: drip test MON and Agora AUSD into the passkey wallet so you can send immediately."
        ),
    ),
    Slide(
        kicker="Step 4",
        title="Send to @alice",
        body="Cash App-like keypad. Pay locks AUSD in dual-exit escrow and emits PaymentOpened for CRE.",
        narration=(
            "Step four: send to at-alice on the Cash App-like keypad. "
            "Pay locks AUSD in dual-exit escrow and opens a PaymentOpened log for CRE."
        ),
    ),
    Slide(
        kicker="Step 5",
        title="CRE settles",
        body="CRE fetches the HMAC attestation, verifies in TEE, writeReport → NonaRegistry → funds released to Alice.",
        points=[
            "Missing attest → pending (no fake release)",
            "Forged MAC → RejectedReport",
            "Silence → payer reclaim in 15 minutes",
        ],
        narration=(
            "Step five: Chainlink CRE fetches the attestation, verifies the HMAC inside the TEE, "
            "and writeReport releases through NonaRegistry. "
            "Missing attestation stays pending. A forged MAC is rejected. "
            "If CRE never releases, the payer reclaims in fifteen minutes."
        ),
    ),
    Slide(
        kicker="Optional",
        title="Criteria gate demo",
        body="Pay without a verified phone: escrow locks, CRE waits, reclaim path stays honest.",
        narration=(
            "Optional: pay on a passkey with no verified phone. Escrow still locks. "
            "CRE stays pending. That is the criteria gate working — not a broken demo."
        ),
        hold_extra=0.6,
    ),
]

AGORA: list[Slide] = [
    Slide(
        kicker="Agora bounty · Cross-border payments",
        title="AUSD is the rail — not a swap UI.",
        body="NonaPay settles remittances in Agora AUSD on Monad Testnet with Cash App-like sends to handles and phone numbers.",
        narration=(
            "For the Agora bounty: NonaPay settles remittances in Agora AUSD on Monad Testnet. "
            "This is a cross-border dollar rail with a Cash App-like send — not a swap interface."
        ),
    ),
    Slide(
        kicker="Onboarding + lock",
        title="Passkey in. AUSD locked.",
        body="Mera passkeys onboard. Payers fund AUSD, lock via NonaGateway into dual-exit escrow until criteria clear.",
        points=[
            "Settlement asset: Agora AUSD",
            "Lock path: NonaGateway → P2PEscrow",
            "Release only after OTP attestation",
        ],
        narration=(
            "Users onboard with Mera passkeys. They fund AUSD, lock it through NonaGateway into dual-exit escrow, "
            "and Chainlink CRE releases only after a real phone OTP attestation verified in a TEE."
        ),
    ),
    Slide(
        kicker="Evidence",
        title="Live product + contracts",
        body="nonad-pay.vercel.app · AUSD on Monad Testnet · github.com/emarc99/nonad-pay",
        narration=(
            "Evidence: the live app at nonad-pay.vercel.app, Agora AUSD on Monad Testnet, "
            "and the open repo at github.com/emarc99/nonad-pay. "
            "Passkey, OTP, pay a handle, CRE release — that is the cross-border payment story."
        ),
        hold_extra=0.7,
    ),
]

CHAINLINK: list[Slide] = [
    Slide(
        kicker="Chainlink bounty · Best CRE workflow",
        title="CRE is the engine — not a watcher.",
        body="Anti-AquaGhost: settlement requires confidential criteria. No spectator unlock.",
        narration=(
            "For the Chainlink CRE bounty: CRE is the settlement engine, not a watcher. "
            "This is anti-AquaGhost — escrow does not unlock because someone is looking."
        ),
    ),
    Slide(
        kicker="TEE / Vault",
        title="Fail-closed criteria",
        body="Vault secrets + HTTPS attest + HMAC verify in TEE. Missing or forged material cannot fake a release.",
        points=[
            "Secrets: nullifier salt + fiat relay token",
            "Forged MAC → approved false / RejectedReport",
            "Missing attest → skip writeReport (pending)",
        ],
        narration=(
            "Inside the TEE, CRE loads Vault secrets, GETs the fiat attestation, and verifies HMAC. "
            "Missing secrets fail closed. A forged MAC writes approved false. "
            "Missing attestation skips writeReport and stays pending — with a fifteen minute reclaim."
        ),
    ),
    Slide(
        kicker="Delivery",
        title="writeReport on Monad",
        body="Log trigger plus cron backup. donRuntime → evm.writeReport → NonaRegistry.onReport via Keystone.",
        narration=(
            "Delivery uses a confidential handler with runtime secrets, "
            "PaymentOpened log trigger and cron backup, "
            "then donRuntime writeReport into NonaRegistry on Monad Testnet through the Keystone forwarder. "
            "Workflow: nonapay-remittance-staging on the private registry."
        ),
        hold_extra=0.7,
    ),
]

MERA: list[Slide] = [
    Slide(
        kicker="Mera bounty · Powered UX",
        title="Primary auth is a passkey.",
        body="Judges should feel Cash App — not a dapp browser. No seed phrases. Face ID in.",
        narration=(
            "For the Mera bounty: primary auth is a Mera passkey. "
            "Judges should feel Cash App, not a dapp browser. No seed phrases."
        ),
    ),
    Slide(
        kicker="One passkey, many keys",
        title="PRF → HD derive",
        body="From one WebAuthn PRF output we derive master and spend keys. The same passkey scopes OTP and handle restore.",
        points=[
            "Index 0 master · index 1 spend",
            "Spend signs Monad txs via viem",
            "OTP + Link existing are passkey-scoped",
        ],
        narration=(
            "From one WebAuthn PRF output we HD-derive multiple keys: master at index zero, spend at index one. "
            "Spend is the signing session for Monad transactions. "
            "The same passkey also binds non-transaction credentials — phone OTP sessions and handle restore — "
            "so identities are not a shared password across passkeys."
        ),
    ),
    Slide(
        kicker="Evidence",
        title="Cold start under three minutes",
        body="Create passkey → funded → send. Frontend: github.com/emarc99/nonad-pay/tree/main/frontend",
        narration=(
            "Evidence: cold start from create passkey to funded send under three minutes, "
            "and the Mera integration in the frontend mera module. That is Mera-powered UX."
        ),
        hold_extra=0.7,
    ),
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = [
        ("nonapay-pitch", PITCH, VOICE),
        ("nonapay-demo", DEMO, VOICE),
        ("nonapay-agora-bounty", AGORA, VOICE_ALT),
        ("nonapay-chainlink-bounty", CHAINLINK, VOICE_ALT),
        ("nonapay-mera-bounty", MERA, VOICE),
    ]
    manifest = []
    for name, slides, voice in jobs:
        path = render_video(name, slides, voice=voice)
        probe = subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "json",
                str(path),
            ],
            text=True,
        )
        dur = float(json.loads(probe)["format"]["duration"])
        manifest.append({"file": str(path), "name": name, "seconds": round(dur, 1)})
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
