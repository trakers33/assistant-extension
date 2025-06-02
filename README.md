<div align="center">

<picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/99cb6303-64e4-4bed-bf3f-35735353e6de" />
    <source media="(prefers-color-scheme: light)" srcset="https://github.com/user-attachments/assets/a5dbf71c-c509-4c4f-80f4-be88a1943b0a" />
    <img alt="Logo" src="https://github.com/user-attachments/assets/99cb6303-64e4-4bed-bf3f-35735353e6de" />
</picture>

![](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![](https://img.shields.io/badge/Typescript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![](https://badges.aleen42.com/src/vitejs.svg)

![GitHub action badge](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite/actions/workflows/build-zip.yml/badge.svg)
![GitHub action badge](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite/actions/workflows/lint.yml/badge.svg)

<img src="https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https://github.com/Jonghakseo/chrome-extension-boilerplate-react-viteFactions&count_bg=%23#222222&title_bg=%23#454545&title=😀&edge_flat=true" alt="hits"/>
<a href="https://discord.gg/4ERQ6jgV9a" target="_blank"><img src="https://discord.com/api/guilds/1263404974830915637/widget.png"/></a>

> This boilerplate
> has [Legacy version](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite/tree/legacy)

</div>

> [!NOTE]
> This project is listed in the [Awesome Vite](https://github.com/vitejs/awesome-vite)

> [!TIP]
> Share storage state between all pages
>
> https://github.com/user-attachments/assets/3b8e189f-6443-490e-a455-4f9570267f8c

## Table of Contents

- [Intro](#intro)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Packages](#packages)
- [Environment Variables](#environment-variables)
- [Module Manager](#module-manager)
- [Community](#community)
- [Reference](#reference)
- [Star History](#star-history)
- [Contributors](#contributors)

## Intro

Meet Sales Assistant Extension is a Chrome/Firefox extension built with React 19, TypeScript, Vite, and Turborepo. It is designed for rapid development and maintainability, with a modular structure and shared packages for common functionality.

## Features

- React 19
- TypeScript
- Tailwind CSS
- Vite (with Rollup)
- Turborepo (monorepo management)
- Prettier & ESLint
- Chrome Extensions Manifest V3
- Custom i18n, HMR, and storage helpers
- End-to-end testing with WebdriverIO

## Project Structure

All main source code lives under the `src/` directory:

- `chrome-extension/` – Manifest and build logic for the extension
- `background/` – Background scripts and utilities
- `pages/` – Extension pages:
  - `content/`, `content-ui/`, `content-runtime/` – Content scripts and injected UIs
  - `options/` – Options page
  - `popup/` – Toolbar popup
  - `side-panel/` – Chrome side panel
- `ui/` – Shared UI components and Tailwind helpers
- `packages/` – Shared logic and utilities (see [Packages](#packages))
- `inlines/` – Inline scripts (e.g., for Google Meet, injectors)

## Getting Started

1. Clone the repository.
2. Ensure your Node.js version is >= 22.12.0 (see `.nvmrc`).
3. Install pnpm globally: `npm install -g pnpm`
4. Run `pnpm install` in the project root.
5. To start development:
   - For Chrome: `pnpm dev`
   - For Firefox: `pnpm dev:firefox`
6. Load the extension in your browser:
   - Chrome: Load the `dist` directory as an unpacked extension
   - Firefox: Load `dist/manifest.json` as a temporary add-on

## Scripts

Key scripts from `package.json`:

- `pnpm dev` – Start development server (Chrome)
- `pnpm dev:firefox` – Start development server (Firefox)
- `pnpm build` – Build for production (Chrome)
- `pnpm build:firefox` – Build for production (Firefox)
- `pnpm lint` – Lint codebase
- `pnpm prettier` – Format codebase
- `pnpm zip` – Build and zip the extension for release
- `pnpm module-manager` – Enable/disable modules (see [Module Manager](#module-manager))

## Packages

Shared packages are located in `src/packages/`:

- `env` – Environment variable helpers ([README](src/packages/env/README.md))
- `i18n` – Internationalization ([README](src/packages/i18n/README.md))
- `shared` – Shared types, constants, hooks ([README](src/packages/shared/README.md))
- `storage` – Chrome storage helpers
- `tailwind-config` – Shared Tailwind CSS config
- `tsconfig` – Shared TypeScript config
- `hmr` – Custom Hot Module Reload plugin
- `dev-utils` – Development utilities
- `vite-config` – Shared Vite config
- `zipper` – Zipping dist for release
- `module-manager` – Enable/disable modules ([README](src/packages/module-manager/README.md))

Each package may have its own README for more details.

## Environment Variables

Environment variables must start with `CEB_` (or `CLI_CEB_` for CLI usage). See [src/packages/env/README.md](src/packages/env/README.md) for advanced usage and conventions.

## Module Manager

The module manager allows you to enable or disable features (pages/modules) in your extension. Run `pnpm module-manager` from the root to launch the tool. See [src/packages/module-manager/README.md](src/packages/module-manager/README.md) for details.

## Community

To chat with other community members, join the [Discord](https://discord.gg/4ERQ6jgV9a) server.

## Reference

- [Chrome Extensions](https://developer.chrome.com/docs/extensions)
- [Vite](https://vitejs.dev/)
- [Turborepo](https://turbo.build/repo/docs)
- [Rollup](https://rollupjs.org/guide/en/)

## Star History

<a href="https://star-history.com/#Jonghakseo/chrome-extension-boilerplate-react-vite&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=Jonghakseo/chrome-extension-boilerplate-react-vite&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=Jonghakseo/chrome-extension-boilerplate-react-vite&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=Jonghakseo/chrome-extension-boilerplate-react-vite&type=Date" />
 </picture>
</a>

## Contributors

This Boilerplate is made possible thanks to all of its contributors.

<a href="https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite/graphs/contributors">
  <img width="500px" src="https://contrib.rocks/image?repo=Jonghakseo/chrome-extension-boilerplate-react-vite" alt="All Contributors"/>
</a>

---

## Special Thanks To

| <a href="https://jb.gg/OpenSourceSupport"><img width="40" src="https://resources.jetbrains.com/storage/products/company/brand/logos/jb_beam.png" alt="JetBrains Logo (Main) logo."></a> | <a href="https://www.linkedin.com/in/j-acks0n"><img width="40" style="border-radius:50%" src='https://avatars.githubusercontent.com/u/23139754' alt='Jackson Hong'/></a> |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

---

Made by [Jonghakseo](https://jonghakseo.github.io/)
