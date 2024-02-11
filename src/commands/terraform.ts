/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import * as terraform from '../terraform';

export class TerraformCommands implements vscode.Disposable {
  private commands: vscode.Disposable[];

  constructor(private client: LanguageClient) {
    this.commands = [
      vscode.commands.registerCommand('tofu.init', async () => {
        await terraform.initAskUserCommand(this.client);
      }),
      vscode.commands.registerCommand('tofu.initCurrent', async () => {
        await terraform.initCurrentOpenFileCommand(this.client);
      }),
      vscode.commands.registerCommand('tofu.apply', async () => {
        await terraform.command('apply', this.client, true);
      }),
      vscode.commands.registerCommand('tofu.plan', async () => {
        await terraform.command('plan', this.client, true);
      }),
      vscode.commands.registerCommand('tofu.validate', async () => {
        await terraform.command('validate', this.client);
      }),
    ];
  }

  dispose() {
    this.commands.forEach((c) => c.dispose());
  }
}
