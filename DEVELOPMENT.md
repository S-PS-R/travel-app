# Development workflow

After each major feature change, verify the implementation, commit the current project changes, and push them to `main` in `https://github.com/S-PS-R/travel-app`.

- Use a descriptive commit title that names the features being implemented, for example `feat(map): add globe planning, continent navigation, and transport legs`.
- Keep commits focused on the completed feature milestone. Describe material limitations and validation in the commit body when useful.
- Run the appropriate type checks, tests, builds, and UI checks before pushing. Fix failures first; do not claim unfinished or untested behavior is complete.
- Include the source, assets, tests, and documentation needed for that milestone. Keep `.env`, credentials, dependency caches, and generated build output out of Git.
- Preserve unrelated user changes and never force-push or rewrite shared history unless explicitly requested.
- After pushing, report the repository link, feature summary, and commit identifier.

The repository is intentionally **public**, as requested by its owner.

Current priority: Google sign-in through Supabase and consent-based friend map sharing. Apply and verify the friend database migration and configure Google OAuth before calling account setup complete.
