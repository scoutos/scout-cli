# Scout CLI

Scout CLI allows one to interact with and update Scout workflows via
[CLI](https://en.wikipedia.org/wiki/Command-line_interface).

## Development

Clone the repo

```bash
git clone git@github.com:scoutos/scout-cli.git
```

[Install Deno](https://docs.deno.com/runtime/getting_started/installation/)

[Setup your environment](https://docs.deno.com/runtime/getting_started/setup_your_environment/)

Install scout-cli locally

```bash
deno install --allow-read --allow-write -n scout-cli src/main.ts --global
```

**Note**: You may have to add Deno to your `PATH`

1. First, let's find out where Deno installed the executable:

```bash
echo "$HOME/.deno/bin"
```

2. You need to add this path to your shell's PATH variable. For ZSH, add this line to your ~/.zshrc file:

```bash
export PATH="$HOME/.deno/bin:$PATH"
```

3. Either restart your terminal or run:

```bash
source ~/.zshrc
```

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
