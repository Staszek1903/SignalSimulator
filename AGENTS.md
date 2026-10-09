# Project preferences

Apply these naming conventions to project-owned C++ code and tests:

- Functions and methods: `snake_case`, for example `add_child` and `is_running`.
- Types (classes, structs, enums, and aliases): `UpperCamelCase`, for example `PanelTree` and `LayoutResult`.
- Variables, parameters, and members: lowercase with underscores between words, for example `left_width`. Private members may retain a trailing underscore, for example `next_id_`.
- Named constants (`constexpr`, configuration constants, and enum values): `UPPER_SNAKE_CASE`, for example `INITIAL_WIDTH`. Runtime locals remain lowercase even when declared `const`.
- Constructors and destructors follow their type names as required by C++.
- Preserve names imposed by external APIs such as raylib and the standard library. Do not rename or edit third-party dependency code or generated build files to enforce these conventions.

Keep documentation examples synchronized with the public API.

Prefer comment-free project-owned code and tests. Use clear names and structure to make the code understandable. Add comments only when genuinely necessary to explain non-obvious constraints, invariants, or reasons that the code cannot express clearly. Put all other explanations, usage guidance, and design details in documentation, and keep that documentation synchronized with the code.
