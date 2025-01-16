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
deno install --allow-read --allow-write --allow-env -n scout-cli src/main.ts --global
```

> **Note**: If Deno isn't in your PATH, run:
>
> ```bash
> echo 'export PATH="$HOME/.deno/bin:$PATH"' >> ~/.zshrc
> source ~/.zshrc
> ```

After you make updates to this repo locally and want to test the `scout-cli` you can run the following to replace your existing copy:

```bash
deno install --allow-read --allow-write --allow-env -n scout-cli src/main.ts --global -f
```

### Using CLI

When you first use the cli tool, you will be asked to set your `apikey`. This should be the secret key found in "API Keys" section in the Scout dashboard settings panel. **Note**: You may have to grant the cli permissions to write, read, delete to your system. The api key will be stored in `~/.scout-cli/secrets.json`.

Example command:

```bash
scout-cli --get-workflow=workflow_id_123
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
