# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Actions CI/CD pipeline
- Issue and Pull Request templates
- MIT License
- CHANGELOG.md for version tracking
- Improved documentation in README.md
- **Complete molecule preparation system**:
  - Command-line interface for `prepare_molecules.py`
  - Automatic PDB download and preparation
  - PDB → PDBQT conversion for receptors
  - SMILES/SDF/MOL2 → PDBQT conversion for ligands
  - Full integration in advanced mode docking flow
- QUICK_START.md guide for easy project execution
- run.sh automation script
- MOLECULE_PREPARATION.md comprehensive documentation

### Changed
- Cleaned up repository (removed test files)
- Updated .gitignore to include package-lock.json
- **Refactored logging**: Replaced all `console.log/error/warn` with structured logger in `docking.js`
  - 36 console statements replaced with Winston logger
  - Added requestId and sessionId context to all log messages
  - Improved log levels (debug/info/warn/error)
- **Advanced mode now fully functional**: Molecule preparation is now executed automatically

### Fixed
- Improved file structure documentation
- Better traceability with structured logging
- Molecule preparation was partially implemented, now complete and integrated

## [1.0.0] - 2024-10-28

### Added
- Initial release of AutoDock Vina automation platform
- Step-by-step wizard interface for docking setup
- Real-time progress tracking
- Batch processing for multiple receptors and ligands
- Advanced mode with PDB download support
- Security features (rate limiting, input validation, file sanitization)
- Docker support
- Google Cloud Run deployment ready
- Structured logging with Winston
- File type validation using magic numbers
- Session management for tracking docking jobs
- Automatic result downloads

### Security
- Rate limiting per endpoint
- File validation (extension and content-based)
- Path traversal protection
- Input sanitization
- CORS configuration
- Security headers with Helmet.js
- Request ID tracking

---

## Types of Changes

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerabilities fixes

