# Obsidian Run

Generate markdown from dataview query and javascript.

✅ Powerful, Dead Simple

## Installation

### Plugin marketplace

⏳ Waiting for approval: https://github.com/obsidianmd/obsidian-releases/pull/2513

### Manual Installation

1. cd to `.obsidian/plugins`
2. git clone this repo
3. `cd obsidian-run && bun install && bun run build`
4. there you go 🎉

## Usage

1. define a starting tag

```md
%% run start 3+4%%
```

2. save the file
3. you markdown will become something like this

```md
%% run start
3+4
%%
7
%% run end %%
```

### Syntax

Each block of run contains three parts: starting tag (required), generated content, ending tag

#### starting tag (required)

you define your expression in the starting tag. The expression will be used to calculate the content. It is the only required part for a run block.

```md
%% run start <expression> %%
```

or you can also write multiple line statements. Notice that if you write in multiple line you must return a value.

````md
%% run start

```ts|js
<your expression in codeblock>
```

%%
````

You can use it with [CodeblockCustomizer](https://github.com/mugiwara85/CodeblockCustomizer), to have folding codeblock.

![](https://user-images.githubusercontent.com/43137033/272329457-d278a370-63d6-4dc2-a3f4-68767745ac92.png)

#### Content

the generated content

#### Ending Tag

ending tag closes the run block.

```md
%% run end <metadata> %%
```

## Advanced Usage

### Access file object

```md
%% run start file.basename %%
```

the file object is the [TFile](https://docs.obsidian.md/Reference/TypeScript+API/TFile/TFile) but it is patched with `file.properties` which is the file yaml properties.

### Page level variable

```md
---
bar: "foo"
---

%% run start file.properties.bar %%
```

### Dataview

you can access the `dv` object if you have dataview plugin installed and enabled.

````md
%% run start

```ts
return dv.markdownList(dv.pages("#ai/image").map((page) => page.file.link));
```

%%
````

### Function

you can write complicated function in starting tag codeblock

### Async Function

You can use the obsidian [request](https://docs.obsidian.md/Reference/TypeScript+API/request) function to fetch data.

### Debug

you can use `console.log` in the starting tag codeblock.

## Note

1. if you want to contribute, please star and open github issue.
2. this plugin is powerful, but it is still under early development. The syntax is subject to change but will be backward compatible as much as possible

## Support

If you are enjoying this plugin then please support my work and enthusiasm by buying me a coffee on https://www.buymeacoffee.com/yomaru.

<a href="https://www.buymeacoffee.com/yomaru" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
