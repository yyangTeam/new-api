# ADR-001: Image Generation Embed via Admin-Configurable iframe

**Date:** 2026-05-31  
**Status:** Accepted  
**Deciders:** yyy

## Context

Users want access to an image generation tool directly within the console without leaving the app. Multiple external image generation services exist, and the preferred service may differ across deployments. A tightly integrated native implementation would require significant ongoing maintenance for each provider.

## Decision

Add an "Image Generation" entry under the Chat sidebar section that renders a full-screen iframe. The embed URL is configured by the admin in System Settings → Console Content. The item is auto-hidden when no URL is set. Visibility also respects the existing two-layer sidebar permission system (admin × user).

## Consequences

**Positive:**
- Zero per-provider maintenance: any image generation website can be embedded
- Admins control which tool is offered per deployment
- Reuses the existing sidebar permission infrastructure with no new patterns
- Full-screen layout (no padding) gives the embedded tool maximum space

**Negative / Trade-offs:**
- Some external sites block iframe embedding via `X-Frame-Options` or `Content-Security-Policy` — admins must choose a compatible URL
- iframe sandbox (`allow-scripts allow-same-origin allow-forms allow-popups`) may need adjustment if the embedded site requires additional permissions
- No native authentication passthrough — the embedded site manages its own auth

## Alternatives Considered

| Option | Why rejected |
|---|---|
| Native image generation UI | High maintenance cost; ties the app to specific providers |
| Multiple configurable embed slots | Over-engineered for current need; can be added later if required |
| Hardcoded URL | No flexibility across deployments |
