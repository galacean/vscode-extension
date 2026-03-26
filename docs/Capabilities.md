# ShaderLab Plugin Capabilities

Purpose: define the feature goals for the ShaderLab plugin and track which parts have already been implemented.

Status markers:

- `[x]` Implemented
- `[ ]` Not implemented yet or only partially implemented

## 1. Product Goal

The plugin should become a complete ShaderLab language support extension for VS Code, not just a syntax highlighter with partial completion.

Its capabilities are grouped into four layers:

- Editing experience
- Semantic understanding
- Code navigation
- Workspace-level collaboration

## 2. Editing Experience

## 2.1 Language Recognition

The plugin should support:

- [x] `.gs`
- [x] `.gsl`
- [ ] Additional ShaderLab-related file types if needed later

## 2.2 Language Configuration

The plugin should provide full VS Code language-configuration support:

- [x] Line comment toggling
  - Uses `//`
  - Works with `Cmd+/` / `Ctrl+/`
- [x] Block comment toggling
  - Uses `/* ... */`
  - Works with the block comment command
- [x] Bracket matching
  - `()`
  - `[]`
  - `{}`
- [x] Auto-closing pairs
  - Quotes: `""`
  - Brackets: `()`, `[]`, `{}`
- [x] Surrounding pairs
  - Wrap selected text with quotes, brackets, or braces
- [x] Indentation rules
  - Stable indentation based on `{}` blocks
  - Works for `Shader`, `SubShader`, `Pass`, `Editor`, `Properties`, `Macros`, and similar blocks
- [x] Folding
  - Block-based folding
  - Nested block folding
- [ ] Word pattern / token selection behavior
  - Better symbol selection, double-click behavior, and completion prefix extraction
- [x] On-enter rules
  - Reasonable indentation and block behavior when pressing Enter

### Comment Syntax

The plugin must clearly distinguish:

- Official comment syntax
  - `//`
  - `/* ... */`
- Preprocessor syntax
  - `#include`
  - `#if`
  - `#ifdef`
  - `#elif`
  - `#else`
  - `#endif`

`#` must be treated as preprocessor syntax, not as comment syntax.

## 2.3 Syntax Highlighting

The plugin should fully cover:

- [x] ShaderLab shell syntax
- [x] Editor syntax
- [x] Render state syntax
- [x] Pass-level program syntax
- [x] Macros and preprocessor directives
- [x] Include statements
- [x] Enum members
- [x] Distinction between structs, functions, and variables

### Major ShaderLab Syntax Categories

- `Shader`
- `SubShader`
- `Pass`
- `UsePass`
- `Editor`
- `Properties`
- `Macros`
- `UIScript`
- `Header(...)`
- `Tags`
- `VertexShader`
- `FragmentShader`
- `RenderQueueType`
- `BlendState`
- `DepthState`
- `StencilState`
- `RasterState`
- Render state fields
- Engine enum types and members
- Editor property types
- Structs / functions / variables
- `#include`
- `#if / #ifdef / #elif / #else / #endif`

## 2.4 Snippets

The plugin should provide:

- [x] Shader root templates
- [x] SubShader / Pass templates
- [x] Editor / Properties / Macros / UIScript templates
- [x] Tags / UsePass templates
- [ ] Single-line property templates
- [ ] `Range` / `Enum` / `Texture` / `Color` property templates
- [x] Render state declaration templates
- [ ] Render state assignment templates
- [x] Struct / function / main / control-flow templates

## 2.5 Formatting

The plugin should support:

- [ ] Document formatting
- [x] Range formatting
- [ ] Stable formatting based on ShaderLab structure

The long-term goal is to move from text beautify toward structure-aware formatting.

## 3. Semantic Understanding

## 3.1 Diagnostics

The plugin should support:

- [x] Source-level syntax diagnostics
- [ ] Pass-level program diagnostics
- [x] Structured error locations
- [ ] Stronger error recovery
- [ ] Invalid render-state field diagnostics
- [ ] Invalid enum value diagnostics
- [ ] Missing entry-function diagnostics
- [ ] Type-mismatch diagnostics

## 3.2 Completion

The plugin should support:

- [x] Preprocessor directive completion
  - `#include`
  - `#define`
  - `#if`
  - `#ifdef`
  - `#ifndef`
  - `#elif`
  - `#else`
  - `#endif`
- [x] User functions
- [x] User structs
- [x] User variables
- [x] Render-state declarations
- [x] Render-state fields
- [x] Engine enum types and members
- [x] Editor property types
- [x] Tags key/value completion
- [x] Vertex/Fragment entry function completion
- [x] Include path completion
- [ ] Macro-name completion

## 3.3 Hover

The plugin should support:

- [x] User function signatures and descriptions
- [ ] Struct field information
- [x] Variable type information
- [ ] Render-state field descriptions
- [ ] Enum member descriptions
- [x] Built-in function descriptions
- [ ] Built-in GLSL variable descriptions

## 3.4 Signature Help

The plugin should support:

- [x] Built-in functions
- [x] User functions
- [x] Active parameter highlighting
- [x] Parameter descriptions
- [ ] Overload support

## 4. Code Navigation

The plugin should support:

- [x] Go to Definition
- [ ] Peek Definition
- [x] Find References
- [x] Rename Symbol
- [x] Document Symbols
- [x] Workspace Symbols

These features should cover at least:

- [x] User functions
- [x] Structs
- [x] Variables
- [x] Render-state declarations
- [ ] Macros

## 5. Workspace-Level Collaboration

The plugin should support:

- [ ] More robust include resolution
- [ ] Diagnostics with stronger workspace awareness
- [x] Multi-file symbol visibility
- [x] Ongoing alignment with the ShaderLab source of truth in the engine repository

## 6. Capability Coverage by ShaderLab Syntax

| Syntax Category | Expected Capability Coverage |
|---|---|
| Comment syntax `//` / `/* */` | Comment toggling, language configuration, stable editing behavior |
| `Shader / SubShader / Pass` | Highlighting, snippets, diagnostics, document symbols |
| `UsePass` | Highlighting, snippets, diagnostics, completion, definition, document links |
| `Editor / Properties / Macros / UIScript` | Highlighting, snippets, diagnostics, completion |
| `Header(...)` | Highlighting, snippets, structural recognition |
| `Tags` | Highlighting, snippets, diagnostics, key/value completion |
| `VertexShader / FragmentShader` | Diagnostics, entry-function completion, definition |
| `RenderQueueType` | Diagnostics, enum completion |
| `BlendState / DepthState / StencilState / RasterState` | Highlighting, snippets, diagnostics, completion, hover, definition |
| Structs / functions / variables | Highlighting, completion, hover, signature help, definition, references, rename |
| Engine enums / enum members | Highlighting, completion, hover |
| Preprocessor / include | Highlighting, directive completion, diagnostics, path completion, document links, workspace-aware parsing later |

## 7. Exit Criteria

The plugin can be considered complete when:

- Language configuration is complete and stable
- Main ShaderLab syntax paths are fully recognized
- Semantic features are no longer driven primarily by text-scanning fallbacks
- Completion, hover, signature help, and diagnostics consume a unified semantic model
- Core navigation features are stable
- The plugin can evolve in sync with the engine’s ShaderLab implementation
