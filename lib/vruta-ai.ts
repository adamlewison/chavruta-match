// shared/agent.ts
import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai"; // or your preferred provider
import { z } from "zod";

interface AgentContext {
  userId: string;
  currentTentacles: any[];
  userRegionId?: number;
  // Abstract operations passed by the host application
  actions: {
    createTentacle: (data: any) => Promise<void>;
    updateTentacle: (id: string, data: any) => Promise<void>;
    deleteTentacle: (id: string) => Promise<void>;
    searchMatches: (criteria: any) => Promise<any>;
  };
}

export async function handleChavrutaIntent(
  userInput: string,
  context: AgentContext,
) {
  const systemPrompt = `
    You are an expert Chavruta Matching Assistant. Your job is to manage the user's study requests ("tentacles") and look for matches.
    
    Current User ID: ${context.userId}
    Current Time/Date: ${new Date().toISOString()}
    
    The user's existing active tentacles:
    ${JSON.stringify(context.currentTentacles, null, 2)}
    
    Guidelines:
    1. If the user wants to learn something new, check if they already have a matching tentacle. If they do, ask if they want to modify it. If not, use 'createTentacle'.
    2. Convert time phrases (like "every weekday morning") into structured local and UTC strings.
    3. If the user implies they want to find someone right now, execute 'searchMatches' after updating or creating their tentacle.
    4. Be warm, encouraging, and brief in your conversational responses.
  `;

  const result = await generateText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    prompt: userInput,
    tools: {
      createTentacle: tool({
        description: "Create a new study request hook (tentacle).",
        inputSchema: z.object({
          subject: z.enum(["gemara", "tanach", "halacha", "mishnah"]),
          availability_local: z
            .string()
            .describe("Structured summary of local time preference"),
          availability_utc: z
            .string()
            .describe("UTC converted time window mapping"),
          medium: z.enum(["online", "in_person", "either"]),
          notes: z.string().optional(),
        }),
        execute: async (input) => {
          await context.actions.createTentacle({
            ...input,
            user_id: context.userId,
            region_id: context.userRegionId,
          });
          return { status: "Tentacle created successfully" };
        },
      }),
      updateTentacle: tool({
        description: "Modify an existing tentacle by ID.",
        inputSchema: z.object({
          id: z.string().uuid(),
          updates: z.object({
            subject: z.string().optional(),
            availability_local: z.string().optional(),
            active: z.boolean().optional(),
          }),
        }),
        execute: async ({ id, updates }) => {
          await context.actions.updateTentacle(id, updates);
          return { status: "Tentacle updated successfully" };
        },
      }),
      searchMatches: tool({
        description:
          "Search for compatible study partners based on subject and timing.",
        inputSchema: z.object({
          subject: z.string(),
          availability_utc: z.string(),
        }),
        execute: async (criteria) => {
          return await context.actions.searchMatches(criteria);
        },
      }),
    },
  });

  return result;
}
