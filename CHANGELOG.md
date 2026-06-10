# Changelog

All notable changes to this project will be documented in this file.

## [1.5.2] - 2026-06-10

### Fixed

- Translation JSON files were saved to the `text2` file area instead of `itext2`. Item embedded files belong in `itext*`; `text*` file areas are reserved for learner log payloads. Re-upload translation files saved under the old area if needed.

## [1.5.1] - 2026-06-08

- Mount download-strings button in Flexbook navigation toolbar with cleanup on close.
- Complete Khmer (km) language pack and Flexbook toolbar styling.
- Require Interactive Video 1.8.1+ (2026060800).

## [1.5] - 2026-05-26

- Added Flexbook support with drag-and-drop for `.h5p` and `.html` files.
- Added translation JSON file upload; H5P content loads strings matching the viewer's site language.
- Added a download button in edit mode to export translatable strings as JSON.
- Refactored JavaScript into a shared `utils` module and added a PHP helper class for form/file handling.
- Added `db/upgrade.php` to register the content type in Flexbook on upgrade.
- Improved report view rendering with Bootstrap 5 tooltip compatibility.
- Continue xAPI score tracking when pass/fail navigation is configured, even after completion.
- Use `force-dismiss` when navigating after pass/fail to avoid unwanted confirmation dialogs.
- Improved xAPI event handling by removing duplicate listeners and preventing duplicate completion marks.
- Added defensive JSON parsing for saved state and pass/fail conditions.
- Moodle 5.2 support.

## [1.4] - 2026-03-09

- Continue tracking xAPI score when pass/fail navigation (`gotoonpassed` / `gotoonfailed`) is enabled.
- Fixed H5P content display formatting in `main.php`.
- Minor CSS adjustment.

## [1.0] - 2024-11-05

### First release