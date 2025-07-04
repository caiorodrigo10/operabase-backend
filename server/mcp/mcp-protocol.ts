import { z } from 'zod';

// Schema para MCP Tools conforme especificação oficial
export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.any()),
    required: z.array(z.string()).optional()
  })
});

export const MCPToolsListResponse = z.object({
  tools: z.array(MCPToolSchema)
});

export const MCPToolCallRequest = z.object({
  name: z.string(),
  arguments: z.record(z.any())
});

export const MCPToolCallResponse = z.object({
  content: z.array(z.object({
    type: z.literal('text'),
    text: z.string()
  })),
  isError: z.boolean().optional()
});

// Schema para MCP Resources
export const MCPResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional()
});

export const MCPResourcesListResponse = z.object({
  resources: z.array(MCPResourceSchema)
});

export const MCPResourceRequest = z.object({
  uri: z.string()
});

export const MCPResourceResponse = z.object({
  contents: z.array(z.object({
    uri: z.string(),
    mimeType: z.string().optional(),
    text: z.string().optional(),
    blob: z.string().optional()
  }))
});

// Schema para MCP Prompts
export const MCPPromptSchema = z.object({
  name: z.string(),
  description: z.string(),
  arguments: z.array(z.object({
    name: z.string(),
    description: z.string(),
    required: z.boolean().optional()
  })).optional()
});

export const MCPPromptsListResponse = z.object({
  prompts: z.array(MCPPromptSchema)
});

export const MCPPromptRequest = z.object({
  name: z.string(),
  arguments: z.record(z.string()).optional()
});

export const MCPPromptResponse = z.object({
  description: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.object({
      type: z.literal('text'),
      text: z.string()
    })
  }))
});

// Tipos derivados
export type MCPTool = z.infer<typeof MCPToolSchema>;
export type MCPResource = z.infer<typeof MCPResourceSchema>;
export type MCPPrompt = z.infer<typeof MCPPromptSchema>;
export type MCPToolCallRequest = z.infer<typeof MCPToolCallRequest>;
export type MCPToolCallResponse = z.infer<typeof MCPToolCallResponse>;