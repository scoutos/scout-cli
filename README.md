# scout-cli

`scout-cli` allows one to interact with and update Scout workflows via
[CLI](https://en.wikipedia.org/wiki/Command-line_interface) commands.

## Development

1. Clone and setup:

```bash
git clone git@github.com:scoutos/scout-cli.git
cd scout-cli
```

2. Install prerequisites:

- [Install Deno](https://docs.deno.com/runtime/getting_started/installation/)
- [Setup your development environment](https://docs.deno.com/runtime/getting_started/setup_your_environment/)

3. Install `scout-cli`:

```bash
deno install --allow-read --allow-write -n scout-cli src/main.ts --global
```

> **Note**: If Deno isn't in your PATH, run:
>
> ```bash
> echo 'export PATH="$HOME/.deno/bin:$PATH"' >> ~/.zshrc
> source ~/.zshrc
> ```

After you make updates to this repo locally and want to test the `scout-cli` you can run the following to replace your existing copy:

```bash
deno install --allow-read --allow-write -n scout-cli src/main.ts --global -f
```

### Using CLI

Example command:

```bash
scout-cli --name=Jiggy
```

Should output something like:

```
Good morning, Jiggy!
```
