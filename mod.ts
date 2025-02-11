// deno-lint-ignore-file
// @ts-ignore no-slow-types

import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";
import { join } from "https://deno.land/std@0.218.0/path/mod.ts";
// import scoutos from "npm:scoutos@0.7.1";
// import { json2yaml } from "https://deno.land/x/json2yaml/mod.ts";
import { parse } from "jsr:@std/yaml";
import {
  bold,
  cyan,
  green,
  red,
  yellow,
  underline,
} from "https://deno.land/std@0.218.0/fmt/colors.ts";
import { expandGlob } from "https://deno.land/std@0.218.0/fs/mod.ts";
import {
  fetchAndCreateTemplate,
  listTemplates,
  getTemplateById,
} from "./utils/fetch_template.ts";
import { Select } from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";
import { slugify } from "https://deno.land/x/slugify/mod.ts";

const BASE_URL = "https://api-prod.scoutos.com";

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

type CommandType = Command<any, any, any, any, any, any, any, any>;

async function getStoredApiKey(): Promise<string | null> {
  // First check for environment variable
  const envApiKey = Deno.env.get("SCOUT_API_KEY");
  if (envApiKey) {
    return envApiKey;
  }
  // Fall back to stored key
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

async function _getInputs(inputs: string): Promise<string> {
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

function _highlightJson(json: string): string {
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

      // inputs is a file path, read the file and parse it as json
      const inputsJson = await Deno.readTextFile(inputs);
      const body = JSON.stringify({
        inputs: JSON.parse(inputsJson),
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

interface WorkflowConfig {
  workflow_config: JSON;
  workflow_key?: string;
}

async function deployWorkflow(
  configPath: string,
  apiKey: string
): Promise<void> {
  try {
    console.log(bold(green("Deploying workflow...")));

    const configData = await Deno.readTextFile(configPath);
    const parsedConfig = parse(configData) as WorkflowConfig;
    const workflowConfig = parsedConfig.workflow_config;
    const workflowKey = parsedConfig.workflow_key;

    if (!parsedConfig) {
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

const runCommand: CommandType = new Command()
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
    if (!inputs) {
      console.error(bold(red("Inputs are required")));
      Deno.exit(1);
    }
    if (!config) {
      console.error(bold(red("Config is required")));
      Deno.exit(1);
    }
    if (!workflowId) {
      console.error(bold(red("Workflow ID is required")));
      Deno.exit(1);
    }
    await executeEphemeralWorkflow(workflowId, inputs, apiKey, config, output);
  });

const getCommand: CommandType = new Command()
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
    console.log("Out and workflowId", output, workflowId);
    // TODO: Implement getWorkflow (where does it go? saved as yaml file locally?)
    // await getWorkflow(workflowId, apiKey, output);
  });

const deployCommand: CommandType = new Command()
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
    if (!config) {
      console.error(bold(red("Config is required")));
      Deno.exit(1);
    }
    await deployWorkflow(config, apiKey);
  });

async function scaffoldProject(projectName: string) {
  const projectPath = join(Deno.cwd(), projectName);

  // Check if the directory already exists
  try {
    const stat = await Deno.stat(projectPath);
    if (stat.isDirectory) {
      console.error(
        bold(red(`Error: Directory '${projectPath}' already exists.`))
      );
      Deno.exit(1);
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      console.error(bold(red(`Error checking directory: ${error.message}`)));
      Deno.exit(1);
    }
  }

  const bootstrap = confirm(
    "Would you like to bootstrap your project with a workflow from a template?"
  );
  const DEFAULT_TEMPLATE_ID = "aWbHA3HU3CIWQq7NNjEFPT";

  let selectedTemplateId = DEFAULT_TEMPLATE_ID;

  if (bootstrap) {
    const templates = await listTemplates();
    const templateChoices = templates.map((t: any) => ({
      name: bold(t.name),
      value: t.id,
    }));

    const formattedTemplateChoices = templateChoices.map(
      (choice: any, index: number) => ({
        name: `${index + 1}. ${choice.name}`,
        value: choice.value,
      })
    );

    selectedTemplateId = await Select.prompt({
      message: "Select a template to bootstrap your project with:",
      options: formattedTemplateChoices,
    });
  }

  const template = await getTemplateById(selectedTemplateId);
  const slugifiedTemplateName = slugify(template.name);
  const workflowPath = join(projectPath, "workflows", slugifiedTemplateName);

  // Create the project directory after the last step
  await Deno.mkdir(workflowPath, { recursive: true });
  await Deno.writeTextFile(
    join(workflowPath, "workflow.yml"),
    template.yamlContent // Ensure YAML content is written
  );

  const defaultInputs: { [key: string]: { user_message: string } } = {
    [DEFAULT_TEMPLATE_ID]: {
      user_message: "Hi!",
    },
  };

  const inputValues = defaultInputs[selectedTemplateId] || {};

  // Create "inputs" folder and write default.json
  const inputsPath = join(workflowPath, "inputs");
  await Deno.mkdir(inputsPath, { recursive: true });
  await Deno.writeTextFile(
    join(inputsPath, "default.json"),
    JSON.stringify(inputValues)
  );

  console.log(
    bold(green(`Project '${projectName}' has been created successfully.`))
  );
}

const initCommand: CommandType = new Command()
  .description("Initialize a new project with optional templates")
  .action(async () => {
    const projectName = prompt("Enter the name of your new project:");
    if (!projectName || /[<>:"/\\|?*\x00-\x1F]/.test(projectName)) {
      console.error(
        bold(red("Invalid project name. Please avoid special characters."))
      );
      Deno.exit(1);
    }
    try {
      await scaffoldProject(projectName);
      console.log(
        bold(green(`\nProject '${projectName}' has been created successfully.`))
      );
      console.log(bold(cyan(`\nNext steps:`)));
      console.log(bold(`  ${cyan(`cd ${projectName}`)}`));
      console.log(bold(`\nHappy scouting! 🚀`));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      console.error(red(`Error: ${errorMessage}`));
      Deno.exit(1);
    }
  });

const linkCommand: CommandType = new Command()
  .description("Link your API key")
  .action(async () => {
    console.log(bold("Please enter your API key:"));
    const apiKey = prompt("API Key:");
    if (!apiKey) {
      console.error(bold(red("API key is required")));
      Deno.exit(1);
    }
    await saveApiKey(apiKey);
    console.log(bold(green("API key saved successfully")));
  });

const workflowsCommand: CommandType = new Command()
  .description("Manage workflows")
  .command("run", runCommand)
  .command("deploy", deployCommand)
  .command("get", getCommand);

export const scoutCli: CommandType = new Command()
  .name("scout")
  .version("0.1.1")
  .description("Scout CLI tool")
  .command("workflows", workflowsCommand)
  .command("init", initCommand)
  .command("link", linkCommand);

if (import.meta.main) {
  await scoutCli.parse(Deno.args);
}
