# opencode-file-viewer

OpenCode 的 TUI 文件查看器插件：在会话里打开一个面板，浏览当前工作区的文件树并预览文件内容，带行号与语法高亮。

> 第三方插件，与 OpenCode 团队无关联。

## 功能

- 会话内文件树浏览：懒加载目录、展开/折叠、鼠标点击
- 文件预览：语法高亮 + 行号
- 高亮语言：**C#**、**JSON**（插件自带语法），**Markdown**（OpenTUI 内置）；其余语言以纯文本显示
- 二进制 / 超大文件友好提示
- 默认忽略 `node_modules`、`.git`、`dist` 等
- 通过 `/files` 命令打开，默认全屏；`f` 可切回侧栏

## 安装

要求 OpenCode v2（`@opencode/plugin@2.x`，实测 2.0.6 及以上）。

### 1. 让 OpenCode 安装本插件

```sh
opencode plugin add github:<owner>/opencode-file-viewer
```

或手动加到全局配置 `opencode.jsonc` / `cli.json`：

```jsonc
{ "plugins": ["github:<owner>/opencode-file-viewer"] }
```

重启 OpenCode。

### 2. 确认加载（插件目录发现）

OpenCode 的 **TUI 插件目录发现**约定是：一个插件目录里

- `index.ts` → 服务端入口
- `tui.ts` → TUI 入口

本插件是纯 TUI 功能，服务端入口是空实现。若重启后 `/files` 没出现，在
`~/.config/opencode/plugins/file-viewer/`（Windows 为
`C:\Users\<你>\.config\opencode\plugins\file-viewer\`）下创建两个转发文件，指向已安装的包：

`index.ts`
```ts
export { default } from "opencode-file-viewer"
```

`tui.ts`
```ts
export { default } from "opencode-file-viewer/tui"
```

> 如果从发现目录里解析不到包名，把上面的说明符换成本机安装目录的绝对 `file://` 路径。

### 本地开发 / 试用

把仓库放到本地，在发现目录里用绝对 `file://` 路径转发：

`index.ts`
```ts
export { default } from "file:///C:/path/to/OpenCodeFileViewer/src/index.ts"
```

`tui.ts`
```ts
export { default } from "file:///C:/path/to/OpenCodeFileViewer/src/tui.tsx"
```

放在全局 `plugins/` 目录则任意工作目录可用；放在项目 `.opencode/plugins/file-viewer/`
则只在该项目生效。

## 使用

1. 进入任意会话，输入 `/files`（别名 `/fv`、`/fileviewer`），或从命令面板选择 **Open file viewer**
2. 面板默认全屏打开。快捷键：

| 按键 | 操作 |
| --- | --- |
| `↓` | 文件树向下移动 |
| `↑` | 文件树向上移动 |
| `Enter` / `→` | 展开目录 / 打开文件 |
| `←` | 折叠目录 / 回到父目录 |
| `PageUp` / `PageDown` | 内容翻页（保留 3 行重叠，方便接读） |
| `r` | 刷新根目录 |
| `f` | 切换全屏 / 侧栏 |
| `q` / `Esc` | 关闭面板 |

> 超长文件名：树栏宽度不变，**整棵树会随选中行左右平移**，让被选中那一行的右端贴到右边界，
> 方便看到文件名结尾（如扩展名）；选中行较短时自动回到左对齐。选中行也会自动纵向滚动到可见。

## 开发

需要 [Bun](https://bun.sh)。

```sh
bun install                  # 安装依赖
bun test                     # 单元测试 + 渲染测试
bun run typecheck            # TypeScript 类型检查
bun run update:tree-sitter   # 重新下载/更新 C#、JSON 语法资源到 src/parsers
```

测试覆盖：文件树构建/导航、忽略规则、文件解码、文件类型映射，以及用
`@opentui/solid` 的 `testRender` 在内存中渲染面板并模拟鼠标点击。

## 配置

面板读取 `context.options`（由宿主传入）。通过目录发现挂载时不会传 options，
因此使用内置默认值；若以后作为带 options 的包加载，可用：

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `ignore` | `string[]` | `[]` | 额外忽略规则，支持 `*` 通配符 |
| `includeHidden` | `boolean` | `true` | 为 `false` 时隐藏点文件 |
| `maxFileSize` | `number` | `524288` | 可预览的最大字节数 |

## 语法高亮说明

OpenTUI 内置的 Tree-sitter 语法不含 C# 与 JSON。插件在 `setup` 时通过
`addFiletypeParser` 向共享的 Tree-sitter 客户端注册这两个语法：

- WASM 与高亮查询文件内置在 `src/parsers/`，离线可用
- 来源：`tree-sitter-wasms`、`tree-sitter-c-sharp@v0.20.0`、`tree-sitter-json@v0.20.2`
- 更新方式见 `parsers-config.json` 与 `scripts/update-tree-sitter-assets.ts`

## 致谢与许可

- 文件树构建、扁平化与键盘导航逻辑改编自 OpenCode TUI diff 查看器的
  `diff-viewer-file-tree-utils.ts` / `diff-viewer-file-tree.tsx`
  （MIT License，版权归 OpenCode 贡献者），见 `src/lib/tree.ts` 顶部注释。
- 语法高亮基于 [OpenTUI](https://github.com/anomalyco/opentui) 与各 Tree-sitter 语法。
- 本项目使用 MIT License。
