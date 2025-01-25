import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";
import { join } from "https://deno.land/std@0.218.0/path/mod.ts";
import scoutos from "npm:scoutos@0.7.1";
import { json2yaml } from "https://deno.land/x/json2yaml/mod.ts";
import { parse } from "jsr:@std/yaml";
import {
  green,
  yellow,
  red,
  cyan,
  bold,
  underline,
} from "https://deno.land/std@0.218.0/fmt/colors.ts";
import { expandGlob } from "https://deno.land/std@0.218.0/fs/mod.ts";

const BASE_URL = "https://api.scoutos.com";

export const config: {
  CONFIG_DIR: string;
  CONFIG_FILE: string;
} = {
  CONFIG_DIR: join(
    Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || ".",
    ".scout-cli"
  ),
  get CONFIG_FILE() {
    return join(this.CONFIG_DIR, "secrets.json");
  },
};

async function getStoredApiKey(): Promise<string | null> {
  try {
    const configData = await Deno.readTextFile(config.CONFIG_FILE);
    return JSON.parse(configData).apiKey || null;
  } catch {
    return null;
  }
}

async function saveApiKey(apiKey: string | null): Promise<void> {
  try {
    await Deno.mkdir(config.CONFIG_DIR, { recursive: true });
    const configData = { apiKey };
    await Deno.writeTextFile(
      config.CONFIG_FILE,
      JSON.stringify(configData, null, 2)
    );
  } catch (error) {
    console.error("Failed to save API key:", error);
    throw error;
  }
}

async function getInputs(inputs: string): Promise<string> {
  if (inputs.startsWith("@")) {
    const filePath = inputs.slice(1);
    try {
      const fileContent = await Deno.readTextFile(filePath);
      return fileContent;
    } catch (error) {
      console.error(`Failed to read inputs from file: ${filePath}`, error);
      Deno.exit(1);
    }
  }
  return inputs;
}

function highlightJson(json: string): string {
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:\s*)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = green;
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = cyan;
        } else {
          cls = yellow;
        }
      } else if (/true|false/.test(match)) {
        cls = red;
      } else if (/null/.test(match)) {
        cls = red;
      }
      return cls(match);
    }
  );
}

async function executeEphemeralWorkflow(
  workflowId: string,
  inputs: string,
  apiKey: string,
  config: string,
  outputPath?: string
): Promise<void> {
  try {
    console.log(bold(green("Executing workflow...")));
    console.log(bold("Workflow ID:"), workflowId);

    for await (const file of expandGlob(config)) {
      console.log(bold("Config file:"), file.path);

      const configData = await Deno.readTextFile(file.path);
      const configJson = parse(configData);

      console.log(bold("configJson"), configJson);

      const body = JSON.stringify({
        inputs: JSON.parse(inputs),
        workflow_config: configJson,
      });

      console.log(bold("body"), body);

      const response = await fetch(`${BASE_URL}/v2/workflows/execute`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
      });

      if (!response.ok) {
        console.log(bold(red("Error message")), response.statusText);
        console.log(bold(red("Error status")), response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(bold(green("Workflow executed successfully:")));
      console.dir(result, { depth: null, colors: true });

      console.log(bold("outputPath"), outputPath);

      if (outputPath) {
        await Deno.writeTextFile(outputPath, JSON.stringify(result, null, 2));
        console.log(bold(green(`Workflow result written to ${outputPath}`)));
      }
    }
  } catch (error) {
    console.error(bold(red("Failed to execute workflow:")), error);
    Deno.exit(1);
  }
}

async function deployWorkflow(
  configPath: string,
  apiKey: string
): Promise<void> {
  try {
    console.log(bold(green("Deploying workflow...")));

    const configData = await Deno.readTextFile(configPath);

    const workflowConfig = configJson.workflow_config;
    const workflowKey = configJson.workflow_key;

    if (!configJson) {
      console.error("Error: Invalid config file.");
      Deno.exit(1);
    }
    if (!workflowKey) {
      console.error("Error: Invalid workflow key.");
      Deno.exit(1);
    }

    const response = await fetch(
      `${BASE_URL}/v2/workflows?workflow_key=${workflowKey}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workflowConfig),
      }
    );

    console.log(bold("Response status:"), response.status);
    console.log(bold("Response status text:"), response.statusText);

    if (!response.ok) {
      if (response.status === 409) {
        console.log(bold(yellow("Workflow Exists, Creating New Revision...")));
        const response = await fetch(
          `${BASE_URL}/v2/workflows/revisions?workflow_key=${workflowKey}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(workflowConfig),
          }
        );

        if (!response.ok) {
          console.log(bold(red("Error response body:")), await response.text());
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        const workflowId = result.data.workflow_id;
        const urlToWorkflow = `https://studio.scoutos.com/workflows/${workflowId}`;

        console.log(
          bold(
            green(
              `Workflow revision created successfully. You can view the workflow at ${urlToWorkflow}`
            )
          )
        );
      }
    } else {
      const result = await response.json();

      const workflowId = result.data.workflow_id;
      const urlToWorkflow = `https://studio.scoutos.com/workflows/${workflowId}`;
      console.log(
        bold(
          green(
            `Workflow deployed successfully. You can view the workflow at ${urlToWorkflow}`
          )
        )
      );
    }
  } catch (error) {
    console.error(bold(red("Failed to deploy workflow:")), error);
    Deno.exit(1);
  }
}

const runCommand = new Command()
  .description("Run a workflow")
  .arguments("<workflow_id:string>")
  .option(
    "-i, --inputs <inputs:string>",
    "JSON string of inputs for the workflow"
  )
  .option("-c, --config <config:string>", "Path to the config file")
  .option("-o, --output <output:string>", "Path to save the output")
  .action(async ({ inputs, config, output }, workflowId) => {
    let apiKey = await getStoredApiKey();
    if (!apiKey) {
      console.log(bold("Please enter your API key:"));
      apiKey = prompt("API Key:");
      if (!apiKey) {
        console.error(bold(red("API key is required")));
        Deno.exit(1);
      }
      await saveApiKey(apiKey);
    }
    await executeEphemeralWorkflow(workflowId, inputs, apiKey, config, output);
  });

const getCommand = new Command()
  .description("Get a workflow")
  .arguments("<workflow_id:string>")
  .option("-o, --output <output:string>", "Path to save the output")
  .action(async ({ output }, workflowId) => {
    let apiKey = await getStoredApiKey();
    if (!apiKey) {
      console.log(bold("Please enter your API key:"));
      apiKey = prompt("API Key:");
      if (!apiKey) {
        console.error(bold(red("API key is required")));
        Deno.exit(1);
      }
      await saveApiKey(apiKey);
    }
    await getWorkflow(workflowId, apiKey, output);
  });

const deployCommand = new Command()
  .description("Deploy a workflow")
  .option("-c, --config <config:string>", "Path to the config file")
  .action(async ({ config }) => {
    let apiKey = await getStoredApiKey();
    if (!apiKey) {
      console.log(bold("Please enter your API key:"));
      apiKey = prompt("API Key:");
      if (!apiKey) {
        console.error(bold(red("API key is required")));
        Deno.exit(1);
      }
      await saveApiKey(apiKey);
    }
    await deployWorkflow(config, apiKey);
  });

const workflowsCommand = new Command()
  .description("Manage workflows")
  .command("run", runCommand)
  .command("deploy", deployCommand)
  .command("get", getCommand);

await new Command()
  .name("scout")
  .version("0.1.0")
  .description("Scout CLI tool")
  .command("workflows", workflowsCommand) // This line registers the workflowsCommand
  .parse(Deno.args);
