# Galacean ShaderLab

ShaderLab language support for Galacean Engine in Visual Studio Code.

## Features

- Syntax highlighting for `.gs` and `.gsl`
- Snippets for common ShaderLab structures
- Code completion for ShaderLab symbols and common built-ins
- Hover information
- Signature help
- Diagnostics
- Range formatting

## Supported Syntax

This extension is designed for the main Galacean ShaderLab workflow, including:

- `Shader`, `SubShader`, `Pass`
- `UsePass`
- `Editor`, `Properties`, `Macros`, `UIScript`
- `Header(...)`
- `Tags`
- `VertexShader`, `FragmentShader`
- `RenderQueueType`
- `BlendState`, `DepthState`, `StencilState`, `RasterState`
- User-defined `struct`, functions, and variables
- Common preprocessor lines such as `#include`, `#if`, and `#ifdef`

## Snippets

Built-in snippets include:

- `Shader`
- `SubShader`
- `Pass`
- `Editor`
- `Properties`
- `Macros`
- `UIScript`
- `UsePass`
- `Tags`
- `Header`
- `BlendState`
- `DepthState`
- `StencilState`
- `RasterState`
- `struct`
- `for`
- `if`
- `main`

## Quick Start

1. Install the extension.
2. Open a `.gs` or `.gsl` file.
3. Start writing ShaderLab code with highlighting, snippets, completion, and diagnostics.

Example:

```shaderlab
Shader "Example/MyShader" {
  Editor {
    Properties {
      Header("Surface") {
        baseColor("Base Color", Color) = (1, 1, 1, 1);
        metallic("Metallic", Range(0, 1, 0.01)) = 0;
      }
    }

    UIScript "./ui.ts";
  }

  SubShader "Default" {
    Pass "Forward" {
      Tags { pipelineStage = "Forward" }
      VertexShader = vert;
      FragmentShader = frag;
    }
  }
}
```

## Development

```bash
pnpm install
npm run compile
```

To debug locally in VS Code:

1. Open this folder in VS Code.
2. Run `Launch Extension`.
3. Open a `.gs` or `.gsl` file in the Extension Development Host.

## License

MIT
