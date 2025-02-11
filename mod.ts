// deno-lint-ignore-file
// @ts-ignore no-slow-types
import { Command } from 'https://deno.land/x/cliffy@v0.25.7/command/mod.ts'
import { join } from 'https://deno.land/std@0.218.0/path/mod.ts'
import { ScoutClient, Scout} from "npm:scoutos@0.8.4";
import { parse } from 'jsr:@std/yaml'
import {
  bold,
  cyan,
  green,
  red,
  yellow,
} from 'https://deno.land/std@0.218.0/fmt/colors.ts'
import { expandGlob } from 'https://deno.land/std@0.218.0/fs/mod.ts'
import { fetchAndCreateTemplate } from './utils/fetch_template.ts'

const BASE_URL = 'https://api-prod.scoutos.com'
const scoutosVersion = '0.8.4'

export const config: {
  CONFIG_DIR: string
  CONFIG_FILE: string
} = {
  CONFIG_DIR: join(
    Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || '.',
    '.scout',
  ),
  get CONFIG_FILE() {
    return join(this.CONFIG_DIR, 'secrets.json')
  },
}

type CommandType = Command<any, any, any, any, any, any, any, any>

async function getStoredApiKey(): Promise<string | null> {
  // First check for environment variable
  const envApiKey = Deno.env.get('SCOUT_API_KEY')
  if (envApiKey) {
    return envApiKey
  }
  // Fall back to stored key
  try {
    const configData = await Deno.readTextFile(config.CONFIG_FILE)
    return JSON.parse(configData).apiKey || null
  } catch {
    return null
  }
}

async function saveApiKey(apiKey: string | null): Promise<void> {
  try {
    await Deno.mkdir(config.CONFIG_DIR, { recursive: true })
    const configData = { apiKey }
    await Deno.writeTextFile(
      config.CONFIG_FILE,
      JSON.stringify(configData, null, 2),
    )
  } catch (error) {
    console.error('Failed to save API key:', error)
    throw error
  }
}

async function _getInputs(inputs: string): Promise<string> {
  if (inputs.startsWith('@')) {
    const filePath = inputs.slice(1)
    try {
      const fileContent = await Deno.readTextFile(filePath)
      return fileContent
    } catch (error) {
      console.error(`Failed to read inputs from file: ${filePath}`, error)
      Deno.exit(1)
    }
  }
  return inputs
}

function _highlightJson(json: string): string {
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:\s*)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = green
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = cyan
        } else {
          cls = yellow
        }
      } else if (/true|false/.test(match)) {
        cls = red
      } else if (/null/.test(match)) {
        cls = red
      }
      return cls(match)
    },
  )
}

async function executeEphemeralWorkflow(
  inputs: string,
  apiKey: string,
  config: string,
  outputPath?: string,
): Promise<void> {
  try {
    console.log(bold(green('Executing workflow...')), config)
    const configData = await Deno.readTextFile(config)
    const configJson = parse(configData)

    // inputs is a file path, read the file and parse it as json
    const inputsJson = await Deno.readTextFile(inputs)
    const client = new ScoutClient({ apiKey: apiKey });
    const result: Scout.WorkflowsRunWithConfigResponse = await client.workflows.runWithConfig({
      inputs: JSON.parse(inputsJson),
      workflow_config: configJson as Scout.WorkflowConfigInput,
    })

    console.log(bold(green('Workflow executed successfully:')))
    console.log("Result" , result)
    console.dir(result, { depth: null, colors: true })

    console.log(bold('Output path:'), outputPath)

    if (outputPath) {
      await Deno.writeTextFile(outputPath, JSON.stringify(result, null, 2))
      console.log(bold(green(`Workflow result written to ${outputPath}`)))
    }
    console.log('Done running all workflows')
  } catch (error) {
    console.error(bold(red('Failed to execute workflow:')), error)
    Deno.exit(1)
  }
}

interface WorkflowConfig {
  workflow_config: JSON
  workflow_key?: string
}

async function deployWorkflow(
  configPath: string,
  apiKey: string,
): Promise<void> {
  console.log(bold(green('Deploying workflow...')))
  const client = new ScoutClient({ apiKey: apiKey });
  const configData = await Deno.readTextFile(configPath)
  const parsedConfig = parse(configData) as WorkflowConfig
  const workflowConfig = parsedConfig.workflow_config
  const workflowKey = parsedConfig.workflow_key

  if (!parsedConfig) {
    console.error('Error: Invalid config file.')
    Deno.exit(1)
  }
  if (!workflowKey) {
    console.error('Error: Invalid workflow key.')
    Deno.exit(1)
  }

  try {
    const response: Scout.SrcHandlersCreateWorkflowRevisionResponse = await client.workflows.create({
      workflow_key: workflowKey,
      body: workflowConfig,
    } as Scout.WorkflowsCreateRequest)
    const workflowId = response?.data?.workflow_id
    const urlToWorkflow = `https://studio.scoutos.com/workflows/${workflowId}`
    console.log(
      bold(
        green(
          `Workflow deployed successfully. You can view the workflow at ${urlToWorkflow}`,
        ),
      ),
    )
  } catch (error: any) {
    if (error?.statusCode) {
      console.log(bold('Response status:'), error.statusCode)
    }
    if (error?.body) {
      console.log(bold('Response status text:'), error.body)
    }
    if (error.statusCode === 409) {
      console.log(bold(yellow('Workflow Exists, Creating New Revision...')))
      const response: Scout.SrcHandlersCreateWorkflowRevisionResponse = await client.workflows.createRevision({
        workflow_key: workflowKey,
        body: workflowConfig,
      } as Scout.WorkflowsCreateRevisionRequest)
      const workflowId = response?.data?.workflow_id
      const urlToWorkflow =
        `https://studio.scoutos.com/workflows/${workflowId}`
      console.log(
        bold(
          green(
            `Workflow revision created successfully. You can view the workflow at ${urlToWorkflow}`,
          ),
        ),
      )
    } else {
      console.error(bold(red('Failed to deploy workflow:')), error)
    }
    Deno.exit(1)
  }
}

const runCommand: CommandType = new Command()
  .description('Run a workflow')
  .option(
    '-i, --inputs <inputs:string>',
    'JSON string of inputs for the workflow',
  )
  .option('-c, --config <config:string>', 'Path to the config file')
  .option('-o, --output <output:string>', 'Path to save the output')
  .action(async ({ inputs, config, output }) => {
    let apiKey = await getStoredApiKey()
    if (!apiKey) {
      console.log(bold('Please enter your API key:'))
      apiKey = prompt('API Key:')
      if (!apiKey) {
        console.error(bold(red('API key is required')))
        Deno.exit(1)
      }
      await saveApiKey(apiKey)
    }
    if (!inputs) {
      console.error(bold(red('Inputs are required')))
      Deno.exit(1)
    }
    if (!config) {
      console.error(bold(red('Config is required')))
      Deno.exit(1)
    }
    await executeEphemeralWorkflow(inputs, apiKey, config, output)
  })

const loginCommand: CommandType = new Command()
  .description('Login to Scout')
  .action(async () => {
    console.log(bold(green('Logging in...')))
    const apiKey = prompt('API Key:')
    if (!apiKey) {
      console.error(bold(red('API key is required')))
      Deno.exit(1)
    }
    await saveApiKey(apiKey)
  })

const getCommand: CommandType = new Command()
  .description('Get a workflow')
  .arguments('<workflow_id:string>')
  .option('-o, --output <output:string>', 'Path to save the output')
  .action(async ({ output }, workflowId) => {
    let apiKey = await getStoredApiKey()
    if (!apiKey) {
      console.log(bold('Please enter your API key:'))
      apiKey = prompt('API Key:')
      if (!apiKey) {
        console.error(bold(red('API key is required')))
        Deno.exit(1)
      }
      await saveApiKey(apiKey)
    }
    console.log('Output and workflowId', output, workflowId)
    // TODO: Implement getWorkflow (where does it go? saved as yaml file locally?)
    // await getWorkflow(workflowId, apiKey, output);
  })

const deployCommand: CommandType = new Command()
  .description('Deploy a workflow')
  .option('-c, --config <config:string>', 'Path to the config file')
  .action(async ({ config }) => {
    let apiKey = await getStoredApiKey()
    if (!apiKey) {
      console.log(bold('Please enter your API key:'))
      apiKey = prompt('API Key:')
      if (!apiKey) {
        console.error(bold(red('API key is required')))
        Deno.exit(1)
      }
      await saveApiKey(apiKey)
    }
    if (!config) {
      console.error(bold(red('Config is required')))
      Deno.exit(1)
    }
    await deployWorkflow(config, apiKey)
  })

const initCommand: CommandType = new Command()
  .description('Initialize a new workflow from template')
  .option('--template [template_id:string]', 'Template ID to use')
  .option('--template-list', 'List all available templates')
  .action(async ({ template, templateList }) => {
    try {
      if (!template && !templateList) {
        console.log(bold('Please use one of these options:'))
        console.log(
          `${
            cyan('--template')
          } <template_id>  - Initialize a workflow from template`,
        )
        console.log(
          `${cyan('--template-list')}          - List all available templates`,
        )
        return
      }

      const templates = await fetchAndCreateTemplate(template as string)

      if (templateList) {
        // List available templates
        console.log(bold('Available templates:'))
        templates.forEach((t: any) => {
          console.log(
            `${bold(cyan(t.id))} - ${t.name}\n${yellow(t.summary)}\n`,
          )
        })
        return
      }

      console.log(green(templates.message))
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error'
      console.error(red(`Error: ${errorMessage}`))
      Deno.exit(1)
    }
  })

const workflowsCommand: CommandType = new Command()
  .description('Manage workflows')
  .command('run', runCommand)
  .command('deploy', deployCommand)
  .command('get', getCommand)

export const scoutCli: CommandType = new Command()
  .name('scout')
  .version(scoutosVersion)
  .description('Scout CLI tool')
  .command("version", new Command()
    .description("Show version information")
    .action(() => {
      console.log(`scout-cli version: ${scoutCli.getVersion()}`)
      console.log(`scoutos version: ${scoutosVersion}`)
    })
  )
  .command('workflows', workflowsCommand)
  .command('login', loginCommand)

if (import.meta.main) {
  await scoutCli.parse(Deno.args)
}
