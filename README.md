# Obsidian Run

Generate markdown from dataview query and javascript.

✅ Powerful, Dead Simple

## Usage

1. define a starting tag

```md
%% run start 3+4%%
```

2. save the file
3. you markdown will become something like this

```md
%% run start 0
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
%% run start <id> <expression> %%
```

or you can also write multiple line statements. Notice that if you write in multiple line you must return a value.

````md
%% run start <id>

```ts|js
<your expression in codeblock>
```

%%
````

#### Content

the generated content

#### Ending Tag

ending tag closes the run block.

```md
%% run end <metadata> %%
```

## Advanced Usage

### Dataview

you can access the dataview object if you have dataview plugin installed and enabled.

### Function

you can write complicated function in starting tag codeblock

### Async Function

You can use the obsidian request api to fetch data.

### Debug

you can use `console.log` in the starting tag codeblock.
