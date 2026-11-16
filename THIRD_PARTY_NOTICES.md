# Third-party notices and license scope

The root [MIT license](LICENSE) is the current license notice for this application's original material. It is not a registration, proof of copyright ownership, permission to relicense other people's material, or a legal certification of AI-generated output. The owner has not requested a replacement licensing policy; this review does not silently change that choice or revoke permissions already granted for earlier copies.

## Frontend notice copies

A versioned inventory of the **38 installed production packages** inspected from the current lockfile is available at [`public/notices/index.json`](public/notices/index.json). Original root LICENSE/NOTICE files found in those packages have been copied unchanged to [`public/notices/`](public/notices/) so notices remain accessible with the deployed site. Packages lacking a root notice file are identified by an empty `noticeFiles` list; their declared license and repository are recorded rather than inventing a copyright notice.

The inventory is a point-in-time technical record for the installed Linux runtime dependencies, not a claim to cover every optional platform binary or every subcomponent bundled by a framework. Preserve embedded upstream notices and review the actual production distribution when updating dependencies. Regenerate the inventory and copies when upgrading the lockfile.

| Direct frontend dependency                           | Declared upstream license                       |
| ---------------------------------------------------- | ----------------------------------------------- |
| Manrope / Newsreader variable font packages          | OFL-1.1; full font license notices are included |
| React / React DOM / Next.js / KaTeX / Three.js / Zod | MIT                                             |
| idb / Lucide React                                   | ISC                                             |

**Do not label the entire dependency tree "MIT".** Next.js's optional Sharp dependencies include Apache-2.0 components and native **libvips under LGPL-3.0-or-later**. Other transitive packages include BSD, Apache, ISC and CC-BY terms. The reference UI does not use Next Image optimization, but package installation can still include those optional native components. Any redistribution of native binaries must preserve their applicable notices and meet their source/relinking obligations; this document is not a substitute for that review.

## Backend

Pinned direct backend packages declare the following licenses in their installed distribution metadata. Their upstream license files remain in the installed wheel/distribution and must be preserved in redistributed environments/images:

| Package                 | Declared license |
| ----------------------- | ---------------- |
| FastAPI / Pydantic      | MIT              |
| SymPy                   | BSD              |
| Uvicorn / HTTPX / pypdf | BSD-3-Clause     |
| python-multipart        | Apache-2.0       |
| Pillow                  | MIT-CMU          |

Transitive Python packages retain their own licenses. A dependency-consistency check (`pip check`) is neither a license audit nor a vulnerability scan.

## User content and attribution

Uploaded textbook pages, images and scans remain subject to their owners' rights. The app's license does not grant permission to upload or redistribute them. API keys are not licensed source assets and are never part of a source-code backup.

GitHub's `arena-agent` contributor credit comes from a commit co-author trailer. It is historical attribution, not a transfer of repository ownership or a grant of collaborator permissions. The current review does not rewrite that history.
