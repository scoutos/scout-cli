import { stringify } from "jsr:@std/yaml";

interface SanityTemplate {
  _id: string;
  name: string;
  summary: string;
  workflow_template_config: Record<string, unknown>;
}

interface WorkflowTemplateConfig {
  workflow_display_name?: string;
  workflow_schema_version?: string;
  workflow_img_url?: string | null;
  workflow_description?: string | null;
  blocks?: Array<Record<string, unknown>>;
}

const projectId = Deno.env.get("SANITY_PROJECT_ID") || "0cfe0chk";
const dataset = Deno.env.get("SANITY_DATASET") || "production";
const apiVersion = Deno.env.get("SANITY_API_VERSION") || "2023-05-03";

async function listTemplates() {
  const query = `*[_type == "workflow_template"]{
    _id,
    name,
    summary,
    workflow_template_config
  }`;

  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(
    query
  )}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const result = data.result;

    if (!result) {
      throw new Error("Templates not found");
    }

    // Ensure the template with id 'aWbHA3HU3CIWQq7NNjEFPT' is first in the list
    const sortedResult = result.sort((a: SanityTemplate, b: SanityTemplate) => {
      if (a._id === "aWbHA3HU3CIWQq7NNjEFPT") return -1;
      if (b._id === "aWbHA3HU3CIWQq7NNjEFPT") return 1;
      return 0;
    });

    return sortedResult.map((template: SanityTemplate) => ({
      id: template._id,
      name: template.name,
      summary: template.summary,
    }));
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to fetch templates: ${errorMessage}`);
  }
}

function removeUnwantedNodes(blocks: Array<Record<string, unknown>>) {
  return blocks.map((block) => {
    // deno-lint-ignore no-unused-vars
    const {
      block_is_output,
      input_schema,
      output_schema,
      ui,
      dependencies,
      trigger_config,
      ...rest
    } = block;
    const cleanedDependencies = dependencies?.map((dep) => {
      const { ui, ...depRest } = dep;
      return depRest;
    });
    return { ...rest, dependencies: cleanedDependencies };
  });
}

async function getTemplateById(templateId: string) {
  const query = `*[_type == "workflow_template" && _id == "${templateId}"][0]`;

  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(
    query
  )}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const result = data.result;

    if (!result) {
      throw new Error("Template not found");
    }

    // Create file for specific template
    const basePath = "workflows";
    const fileName = `${result.name.toLowerCase().replace(/\s+/g, "_")}.yml`;
    const filePath = `${basePath}/${fileName}`;

    // Parse the JSON string from workflow_template_config

    let templateConfig: WorkflowTemplateConfig = {};
    if (result.workflow_template_config.code) {
      try {
        templateConfig = JSON.parse(result.workflow_template_config.code);
      } catch (e) {
        console.error("Error parsing template config:", e);
      }
    }

    // Create the config in the correct format
    const config = {
      workflow_key: result.name.toLowerCase().replace(/\s+/g, "_"),
      workflow_config: {
        workflow_display_name:
          templateConfig.workflow_display_name || result.name,
        workflow_schema_version:
          templateConfig.workflow_schema_version || "1.0",
        workflow_img_url: templateConfig.workflow_img_url || null,
        workflow_description: templateConfig.workflow_description || null,
        blocks: removeUnwantedNodes(templateConfig.blocks || []),
      },
    };

    // Convert to YAML with proper options
    const yamlContent = stringify(config, {
      lineWidth: -1,
      skipInvalid: true,
    });

    // Create workflows directory if it doesn't exist
    await Deno.mkdir(basePath, { recursive: true });
    await Deno.writeTextFile(filePath, yamlContent);

    return { yamlContent, name: result.name }; // Return YAML content and name
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to fetch template: ${errorMessage}`);
  }
}

export async function fetchAndCreateTemplate(templateId?: string) {
  if (!templateId) {
    return await listTemplates();
  } else {
    return await getTemplateById(templateId);
  }
}

export { listTemplates, getTemplateById };
