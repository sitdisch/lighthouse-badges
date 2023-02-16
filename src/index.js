#!/usr/bin/env node

import CLI from 'clui';
import { calculateLighthouseMetrics, processParameters } from './lighthouse-badges.js';
import parser from './argparser.js';

const handleUserInput = async (spinner) => {
  try {
    if (process.env.LIGHTHOUSE_BADGES_PARAMS) {
      process.stdout.write(`LIGHTHOUSE_BADGES_PARAMS: ${process.env.LIGHTHOUSE_BADGES_PARAMS}\n`);
    }
    spinner.start();
    await processParameters(await parser.parse_args(), calculateLighthouseMetrics);
    spinner.stop();
  } catch (err) {
    process.stderr.write(`${err}\n`);
    process.exit(1);
  }
};

(() => handleUserInput(new CLI.Spinner('Running Lighthouse, please wait...', ['◜', '◠', '◝', '◞', '◡', '◟'])))();

export default handleUserInput;
