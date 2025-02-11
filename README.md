# scout-cli

`scout-cli` allows one to interact with and update Scout workflows via
[CLI](https://en.wikipedia.org/wiki/Command-line_interface) commands.

## Using `scout-cli`

### Setup

1. Download the appropriate executable for your system from the [Latest Release](https://github.com/scoutos/scout-cli/releases/tag/latest/). For this example we will download the `scout-cli-macos` artifact.

- [macos](https://github.com/scoutos/scout-cli/releases/tag/latest/scout-cli-macos).
- [linux](https://github.com/scoutos/scout-cli/releases/tag/latest/scout-cli-linux).
- [windows](https://github.com/scoutos/scout-cli/releases/tag/latest/scout-cli-windows.exe).
- Alternatively, you can build the cli from source `deno compile --allow-read --allow-write --allow-env --allow-net --output scout-cli-macos mod.ts`.

2. You might need to move & rename the executable to a location where your system can find it.

```bash
# Move & rename executable 
sudo mv scout-cli-macos /usr/local/bin/scout-cli
```

3. Now you should be able to use `scout-cli` from your system! Trying running `scout-cli --help` to see if it works.
4. If you want to remove the cli you can run `sudo rm /usr/local/bin/scout-cli`.
5. **Note**: You may have to grant the cli permissions to write, read, delete to your system.
   - `sudo chmod +x /usr/local/bin/scout-cli`

### API Key

1. When you first use the cli tool, you will be asked to set your `apikey`. This should be the secret key found in "API Keys" section in the Scout dashboard settings panel. The api key will be stored in `~/.scout-cli/secrets.json`.
2. Alternatively, you can set the `SCOUT_API_KEY` environment variable. This is useful if you want to use the cli in a CI/CD pipeline.

Example command:

```bash
scout-cli workflows deploy --config ./workflows/top_trending.yml
```

```bash
scout-cli workflows run --config ./workflows/top_trending.yml --inputs ./inputs/top_trending.json
```

### Using Templates

The CLI provides commands to work with workflow templates:

1. List all available templates:

```bash
scout init --template-list
```

2. Initialize a workflow from a template:

```bash
scout init --template <template_id>
```

This will:

- Create a new workflow configuration file in your current directory
- Name the file based on the template name (e.g., `ai_slack_bot_advanced.yml`)

3. You can then deploy this template using the deploy command:

```bash
scout workflows deploy --config ./workflows/name_of_your_workflow.yml
```

## Local Development

1. Clone and setup:

```bash
git clone git@github.com:scoutos/scout-cli.git
cd scout-cli
```

2. Install prerequisites:

- [Install Deno](https://docs.deno.com/runtime/getting_started/installation/)
- [Setup your development IDE environment](https://docs.deno.com/runtime/getting_started/setup_your_environment/)

3. Now you should be able to run the code locally:

```bash
deno task dev --help
```

```bash
deno task dev workflows deploy --config ./examples/starter/workflows/source_mapping.yml
```

3. Now you should be able to use `scout` from your system! Trying running `scout --help` to see if it works.
4. If you want to remove the cli you can run `sudo rm /usr/local/bin/scout`.
5. **Note**: You may have to grant the cli permissions to write, read, delete to your system.
