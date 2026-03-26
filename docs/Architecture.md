# ShaderLab Plugin Architecture

Purpose: define the long-term technical architecture of the ShaderLab plugin and track which parts have already been implemented.

Status markers:

- `[x]` Implemented
- `[ ]` Not implemented yet or only partially implemented

## 1. Architecture Goals

The architecture must solve two core problems:

1. [x] Use `engine/packages/shader-lab` as the semantic source of truth
2. [ ] Build all language features on top of a unified semantic model instead of provider-specific inference

## 2. Layered Architecture

The target architecture is split into four layers.

### A. Integration Layer

- [x] VS Code extension host
- [x] LSP connection
- [x] File and document lifecycle management

### B. Parsing Layer

- [x] Source parser
- [ ] Pass parser
- [ ] Macro / include processing

### C. Semantic Model Layer

- [ ] `SourceSemanticModel`
- [ ] `PassSemanticModel`
- [ ] `SymbolTable`
- [ ] `TypeTable`
- [ ] `ScopeTree`

### D. Provider Layer

- [x] Diagnostics provider
- [x] Completion provider
- [x] Hover provider
- [x] Signature help provider
- [x] Definition / references / rename providers

## 3. Module Design

## 3.1 Client

Responsibilities:

- [x] Activate the extension
- [x] Start the language server
- [x] Register grammar, snippets, formatter, language configuration, and lightweight local providers

Principles:

- [x] The client should not own core ShaderLab semantics
- [x] Apart from lightweight editor-side features, semantic behavior should live in the server

## 3.2 Server

Responsibilities:

- [x] Host the main ShaderLab language features
- [x] Manage document caches and semantic-model caches

## 3.3 SourceSemanticModel

Responsibility:

- [ ] Represent ShaderLab source-level structure

It should eventually cover:

- [ ] `Shader`
- [ ] `Editor`
- [ ] `Properties`
- [ ] `Macros`
- [ ] `UIScript`
- [ ] `SubShader`
- [ ] `UsePass`
- [ ] `Pass`
- [ ] `Tags`
- [ ] `RenderQueueType`
- [ ] `BlendState / DepthState / StencilState / RasterState`

## 3.4 PassSemanticModel

Responsibility:

- [ ] Represent pass-level program semantics

It should eventually cover:

- [ ] Structs
- [ ] Functions
- [ ] Function parameters
- [ ] Variables
- [ ] Scopes
- [ ] Type relationships
- [ ] Dot-access resolution

## 3.5 SymbolTable

Responsibility:

- [ ] Provide a unified symbol registry

At minimum, it should represent:

- [x] Functions
- [x] Structs
- [x] Variables
- [x] Render states
- [ ] Macros
- [ ] Enum types
- [ ] Enum members

## 3.6 TypeTable

Responsibility:

- [ ] Provide explicit type descriptions and member relationships

It should eventually cover:

- [ ] Built-in types
- [ ] Engine enums
- [ ] User structs
- [ ] Render-state pseudo-types

## 3.7 ScopeTree

Responsibility:

- [ ] Handle visibility, shadowing, and scope lookup

It should eventually cover:

- [ ] Shader scope
- [ ] SubShader scope
- [ ] Pass scope
- [ ] Function scope
- [ ] Block scope

## 3.8 Workspace Index

Responsibility:

- [x] Track workspace folders
- [x] Discover `.gs`, `.gsl`, and `.glsl` files in the workspace
- [x] Merge disk-backed files and open-document state
- [x] Cache lightweight semantic models for unopened files
- [x] Provide a shared data source for workspace-level providers

Current limitations:

- [ ] It is not yet a full project-wide semantic graph
- [ ] Include expansion is not yet part of the core model
- [ ] Cross-file type and scope merging is still incomplete

## 4. Runtime Data Flow

## 4.1 Document Update Flow

1. [x] A document changes
2. [x] Source parsing is triggered
3. [ ] `SourceSemanticModel` is built
4. [ ] `PassSemanticModel` is built for each pass
5. [ ] The result is merged into a `DocumentSemanticState`

## 4.2 Diagnostics Flow

1. [ ] Read `SourceSemanticModel.sourceErrors`
2. [ ] Read `PassSemanticModel.passErrors`
3. [x] Map parser results to LSP `Diagnostic`

## 4.3 Completion Flow

### Regular completion

1. [ ] Resolve the current scope
2. [x] Collect visible user symbols
3. [x] Add built-ins, enums, and language intrinsics
4. [x] Return completion items

### Dot completion

1. [x] Resolve the left-hand symbol
2. [ ] Resolve the left-hand type
3. [ ] Query `TypeTable.members`
4. [x] Return fields / members

### Special-context completion

Already implemented:

- [x] Preprocessor directives
- [x] Include paths
- [x] `Tags` key/value pairs
- [x] `VertexShader` / `FragmentShader` entry functions
- [x] `UsePass` targets

## 4.4 Hover Flow

1. [x] Resolve the symbol under the cursor
2. [ ] Read its descriptor / type / documentation from a unified semantic state
3. [x] Build hover output

## 4.5 Signature Help Flow

1. [x] Resolve the current call expression
2. [x] Resolve the function symbol
3. [x] Read the parameter list and active argument index
4. [x] Build signature help output

## 4.6 Navigation Flow

Already implemented:

- [x] Definition
- [x] References
- [x] Rename
- [x] Document Symbols
- [x] Workspace Symbols
- [x] Document Links

Current workspace-backed navigation already covers:

- [x] User functions
- [x] Structs
- [x] Variables
- [x] Render-state declarations
- [x] `UsePass` targets
- [x] Relative `#include` targets

## 5. Gap Between Current and Final Architecture

| Dimension | Current State | Final State |
|---|---|---|
| Source of truth | New source parser plus lightweight scanning | Engine parser plus full semantic model |
| Source structure | Partial | Formal source-level semantic model |
| Pass structure | Approximate scanning | Formal pass-level semantic model |
| Type system | Name-based inference | Explicit `TypeTable` |
| Scopes | Approximate and local | Explicit `ScopeTree` |
| Provider coupling | Some providers still depend on completion-oriented assumptions | All providers consume unified semantic state |
| Workspace model | Lightweight `WorkspaceIndex` | Full project semantic graph |

## 6. How the Final Architecture Solves Current Problems

### Problem 1: Lightweight models still rely on text scanning

Solution:

- Replace text-scanning main paths with a formal `PassSemanticModel`

### Problem 2: Scope and type resolution are still weak

Solution:

- Introduce `ScopeTree` and `TypeTable`

### Problem 3: Hover and signature help still depend on completion-shaped data

Solution:

- Make every provider consume the same semantic state directly

### Problem 4: Include support is still incomplete

Solution:

- Move include handling into the parsing and semantic layers instead of keeping it as isolated provider logic

### Problem 5: Advanced workspace features are still limited

Solution:

- Upgrade the current `WorkspaceIndex` into a true project-wide semantic index

## 7. Architecture Principles

- Do not let providers guess semantics independently
- Do not depend on parser-private runtime state
- Do not keep text scanning as the primary semantic path
- Keep the extension aligned with the engine’s ShaderLab implementation
- Build the model first, then build providers on top of it

## 8. Exit Criteria

The architecture can be considered complete when:

- Source-level and pass-level semantics are formalized
- Completion, hover, signature help, and diagnostics all consume a unified model
- Definition, references, and rename extend naturally from the same model
- Include and multi-file behavior are part of the semantic core
- The plugin can evolve in long-term sync with the engine’s ShaderLab implementation
