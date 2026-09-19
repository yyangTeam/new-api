# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Image Generation embed page: admin-configurable iframe under the Chat sidebar section (see `docs/decisions/2026-05-31-image-gen-embed.md`)

## [v0.3.1] - 2026-09-19

### Changed
- System update/rollback is now two-step: `PerformUpdate` / `RollbackService` / `RollbackToVersion` stage the new binary and return `need_restart` instead of auto-restarting. The dashboard download action then prompts a deliberate "Restart now" (and the rollback panel shows a staged-restart banner). Splitting download from restart makes the restart survivable in Docker, where the restart policy relaunches the same container with the swapped binary intact.

### Fixed
- `pickAssetName` now matches the assets `.github/workflows/release.yml` actually publishes (macOS single binary `new-api-macos-<tag>`; Windows `new-api-<tag>.exe`). macOS/Windows in-place update/rollback no longer fails with "No matching binary found".
- `Dockerfile` accepts `--build-arg VERSION` to override the committed `VERSION` file, so a manual `docker build` injects a version matching the release tag (the `release.TagName == common.Version` check and the update banner work). CI is unchanged — `docker-build.yml` still writes `VERSION` from the git tag and passes no arg.

## [Previous]

> Changes before this CHANGELOG was established are tracked in git history and upstream PRs.
> Run `git log --oneline` or browse GitHub pull requests for details.
