import { z } from "zod";

const unifiedSchema = z.object({
    type: z.string().describe("Type of output requested: either README or code"),
    language: z.string().optional().describe("Programming language detected from file extension (for code requests)"),
    commenttext: z.string().optional().describe("Top-level comments describing code functionality, if needed"),
    code: z.string().optional().describe("Executable code without inline comments or unnecessary strings and all newline represnted as '\n'"),
    content: z.string().optional().describe("The README content in markdown format, describing purpose, usage, and configuration"),
});

export default unifiedSchema;