#!/usr/bin/env node
import { Command } from 'commander';
import { ScanEngine } from './scan-engine';
import { OutputFormatter } from './output-formatter';
declare const program: Command;
declare const scanEngine: ScanEngine;
declare const outputFormatter: OutputFormatter;
export { program, scanEngine, outputFormatter };
//# sourceMappingURL=index.d.ts.map