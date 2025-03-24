// CLI tool for initializing a new MCP server in various apps (Claude, etc.)

import { group, log, multiselect, text } from '@clack/prompts';
import chalk from 'chalk';
import { english, generateMnemonic } from 'viem/accounts';
import { configureClaude } from './claude.js';
import { isUuid, validateMnemonic } from './utils.js';

type ToolWithKeys = {
  name: string;
  keys: { name: string; label: string; required: boolean }[];
};

const TOOLS_WITH_REQUIRED_KEYS: ToolWithKeys[] = [
  {
    name: 'OpenRouter',
    keys: [
      {
        name: 'OPENROUTER_API_KEY',
        label: 'OpenRouter API Key',
        required: true,
      },
    ],
  },
];

const baseBlue = chalk.hex('#0052FF');

export async function init() {
  console.log(
    baseBlue(` 
░▒▓███████▓▒░ ░▒▓██████▓▒░ ░▒▓███████▓▒░▒▓████████▓▒░      ░▒▓██████████████▓▒░ ░▒▓██████▓▒░░▒▓███████▓▒░  
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░             ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ 
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░             ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░ 
░▒▓███████▓▒░░▒▓████████▓▒░░▒▓██████▓▒░░▒▓██████▓▒░        ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓███████▓▒░  
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░▒▓█▓▒░             ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░▒▓█▓▒░             ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░        
░▒▓███████▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓███████▓▒░░▒▓████████▓▒░      ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░░▒▓█▓▒░`),
  );
  console.log(`\n`);
  console.log(
    chalk.blueBright(
      `🔵 Welcome to the Base MCP CLI! \nThis tool will help you initialize a new MCP server in various apps (Claude, etc.)\nTo learn more, visit https://github.com/base/base-mcp.`,
    ),
  );

  console.log(`\n`);

  log.step('Step 1 of 2: API Keys.');
  log.info(
    'Obtain Coinbase Developer Platform (CDP) API keys at https://portal.cdp.coinbase.com/projects/api-keys.',
  );

  const keys = await group({
    cdpKeyId: () =>
      text({
        message: 'CDP Key ID:',
        validate: (value) => {
          if (!value) return 'Enter a valid CDP Key ID';
          if (!isUuid(value)) return 'Invalid API Key ID';
        },
      }),
    cdpSecret: () =>
      text({
        message: 'CDP Secret:',
        validate: (value) => {
          if (!value) return 'Enter a valid CDP Secret';
        },
      }),
    seedPhrase: () =>
      text({
        message:
          'Mnemonic Phrase (optional, will generate a new one if not provided):',
        validate: (value) => {
          if (value) {
            return validateMnemonic(value) ? value : 'Invalid Mnemonic Phrase';
          }
        },
      }),
  });

  const optionalKeys = await multiselect({
    message: 'Would you like to configure additional integrations?',
    options: TOOLS_WITH_REQUIRED_KEYS.map((tool) => ({
      label: tool.name,
      value: tool.name,
    })),
  });

  let otherKeys: Record<string, string> = {};
  // Collect other keys the user wants to configure
  if (Array.isArray(optionalKeys) && optionalKeys.length > 0) {
    const promptsObject: Record<string, () => Promise<string | symbol>> = {};
    for (const key of optionalKeys) {
      const tool = TOOLS_WITH_REQUIRED_KEYS.find((t) => t.name === key);
      if (!tool) continue;

      for (const key of tool.keys) {
        promptsObject[key.name] = () =>
          text({
            message: `${key.label}:`,
            validate: (value) => {
              if (key.required && !value) {
                return `Enter a valid ${key.label}`;
              }
            },
          });
      }
    }
    otherKeys = await group(promptsObject);
  }

  log.step('Step 2 of 2: Configure MCP clients.');

  const clients = await multiselect({
    message: 'Which clients would you like to configure?',
    options: [{ label: 'Claude', value: 'claude' }],
  });

  if (!keys.seedPhrase) {
    keys.seedPhrase = generateMnemonic(english, 256);
  }

  if (Array.isArray(clients) && clients.includes('claude')) {
    log.step('Configuring Claude');

    await configureClaude({
      cdpKeyId: keys.cdpKeyId,
      cdpSecret: keys.cdpSecret,
      mnemonicPhrase: keys.seedPhrase,
      optionalKeys: otherKeys,
    });
  }
}
