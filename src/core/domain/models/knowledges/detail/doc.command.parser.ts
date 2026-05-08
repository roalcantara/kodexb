import type { CommandKnowledge } from '../schemas/knowledge.schema'

/**
 * Preamble for a command entry:
 *   ```sh
 *   <command>
 *   ```
 *
 *   ### DESCRIPTION
 *   > <desc>
 */
export const buildCommandPreamble = (entry: CommandKnowledge) =>
  `\`\`\`sh\n${entry.key}\n\`\`\`\n\n### DESCRIPTION\n\n> ${entry.desc}`
