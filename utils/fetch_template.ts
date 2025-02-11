import { stringify } from 'jsr:@std/yaml'

interface SanityTemplate {
  _id: string
  name: string
  summary: string
  workflow_template_config: Record<string, unknown>
}

interface WorkflowTemplateConfig {
  workflow_display_name?: string
  workflow_schema_version?: string
  workflow_img_url?: string | null
  workflow_description?: string | null
  blocks?: Array<Record<string, unknown>>
}

export async function fetchAndCreateTemplate(templateId?: string) {
  const projectId = Deno.env.get('SANITY_PROJECT_ID') || '0cfe0chk'
  const dataset = Deno.env.get('SANITY_DATASET') || 'production'
  const apiVersion = Deno.env.get('SANITY_API_VERSION') || '2023-05-03'

  // Query to fetch either all templates or a specific one
  const query = templateId
    ? `*[_type == "workflow_template" && _id == "${templateId}"][0]`
    : `*[_type == "workflow_template"]{
        _id,
        name,
        summary,
        workflow_template_config
      }`

  const url =
    `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${
      encodeURIComponent(query)
    }`

  try {
    const response = await fetch(url)
    const data = await response.json()
    const result = data.result

    if (!result) {
      throw new Error('Template not found')
    }

    if (!templateId) {
      // List all templates
      return result.map((template: SanityTemplate) => ({
        id: template._id,
        name: template.name,
        summary: template.summary,
      }))
    }

    // Create file for specific template
    const fileName = `${result.name.toLowerCase().replace(/\s+/g, '_')}.yml`
    const filePath = `examples/starter/workflows/${fileName}`

    // Parse the JSON string from workflow_template_config.code
    let templateConfig: WorkflowTemplateConfig = {}
    if (result.workflow_template_config.code) {
      try {
        templateConfig = JSON.parse(result.workflow_template_config.code)
      } catch (e) {
        console.error('Error parsing template config:', e)
      }
    }

    // Create the config in the correct format
    const config = {
      workflow_key: result.name.toLowerCase().replace(/\s+/g, '_'),
      workflow_config: {
        workflow_display_name: templateConfig.workflow_display_name ||
          result.name,
        workflow_schema_version: templateConfig.workflow_schema_version ||
          '1.0',
        workflow_img_url: templateConfig.workflow_img_url || null,
        workflow_description: templateConfig.workflow_description || null,
        blocks: templateConfig.blocks || [],
      },
      _type: 'code',
      workflow_display_name: result.name,
      workflow_schema_version: '1.0',
    }

    // Convert to YAML with proper options
    const yamlContent = stringify(config, {
      lineWidth: -1,
      skipInvalid: true,
    })

    // Create templates directory if it doesn't exist
    await Deno.mkdir('templates', { recursive: true })
    await Deno.writeTextFile(filePath, yamlContent)

    return { message: `Template created: ${filePath}` }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error
      ? error.message
      : 'Unknown error'
    throw new Error(`Failed to fetch template: ${errorMessage}`)
  }
}
