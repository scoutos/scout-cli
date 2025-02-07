# scout-cli

`scout-cli` allows one to interact with and update Scout workflows via
[CLI](https://en.wikipedia.org/wiki/Command-line_interface) commands.

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
deno task dev workflows get workflow_id_123
```

### Using `scout-cli`

1. (Update or Delete this line) Download the appropriate executable for your system from the [Latest Release](https://github.com/scoutos/scout-cli/releases/tag/latest/). For this example we will download the `scout-cli-macos` artifact.

- [macos](https://github.com/scoutos/scout-cli/releases/tag/latest/scout-cli-macos).
- [linux](https://github.com/scoutos/scout-cli/releases/tag/latest/scout-cli-linux).
- [windows](https://github.com/scoutos/scout-cli/releases/tag/latest/scout-cli-windows.exe).
- Alternatively, you can build the cli from source `deno compile --allow-read --allow-write --allow-env --allow-net --output scout-cli-macos mod.ts`.

2. If you downloaded the zipped artifact, Unzip the file then run the following commands to make the executable available on your system:

```bash
# Give permissions to run on mac (TODO: fix this if necessary, current error: xattr: scout-cli-macos: No such xattr: com.apple.quarantine)
xattr -d com.apple.quarantine scout-cli-macos

# Move & rename executable 
sudo mv scout-cli-macos /usr/local/bin/scout-cli
```

3. Now you should be able to use `scout-cli` from your system! Trying running `scout-cli --help` to see if it works.
4. If you want to remove the cli you can run `sudo rm /usr/local/bin/scout-cli`.
5. **Note**: You may have to grant the cli permissions to write, read, delete to your system.

### Setup API Key

1. When you first use the cli tool, you will be asked to set your `apikey`. This should be the secret key found in "API Keys" section in the Scout dashboard settings panel. The api key will be stored in `~/.scout-cli/secrets.json`.
2. Alternatively, you can set the `SCOUT_API_KEY` environment variable. This is useful if you want to use the cli in a CI/CD pipeline.

Example command:

```bash
scout-cli workflows get workflow_id_123
```

Should output:

```
{
  "data": {
    "workflow_config": {
      "workflow_display_name": "Workflow Name",
      "workflow_schema_version": "1.0",
      "workflow_img_url": "123",
      "workflow_description": null,
      "blocks": [
        {
          "block_archetype_id": "com.scoutos.input",
          "block_config": [],
          "block_display_name": "Inputs",
          "block_id": "inputs",
          "block_inputs": {
            "items": [
              {
                "display_name": "User's Message",
                "input_type": "long_text",
                "is_optional": false,
                "key": "user_message"
              }
            ]
          },
          "block_is_output": false,
          "dependencies": [],
          "input_schema": {},
          "output_schema": [],
          "ui": {
            "position": {
              "x": 5,
              "y": -173
            }
          },
          "trigger_config": null
        }
      ]
    },
    "last_updated_at": "2025-01-15T16:12:36.874880Z",
    "created_at": "2025-01-10T15:33:04.483387Z",
    "created_by": {
      "type": "user",
      "details": {
        "user_id": "123",
        "org_id": "123",
        "scout_organization_id": "1223",
        "email": {
          "primary": "123",
          "verified": true
        }
      }
    },
    "last_updated_by": {},
    "revision_id": "123",
    "workflow_id": "123",
    "is_draft": true
  }
}
```

Testing the cli locally:

```bash
deno run dev workflows deploy --config ./examples/starter/workflows/source_mapping.yml
```
