/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import * as vscode from 'vscode';
import { config, getScope } from '../utils/vscode';

export class TerraformLSCommands implements vscode.Disposable {
  private commands: vscode.Disposable[];

  constructor() {
    this.commands = [
      vscode.workspace.onDidChangeConfiguration(async (event: vscode.ConfigurationChangeEvent) => {
        if (event.affectsConfiguration('opentofu') || event.affectsConfiguration('terraform-ls')) {
          const reloadMsg = 'Reload VSCode window to apply language server changes';
          const selected = await vscode.window.showInformationMessage(reloadMsg, 'Reload');
          if (selected === 'Reload') {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
          }
        }
      }),
      vscode.commands.registerCommand('tofu.enableLanguageServer', async () => {
        if (config('opentofu').get('languageServer.enable') === true) {
          return;
        }

        const scope: vscode.ConfigurationTarget = getScope('opentofu', 'languageServer.enable');

        await config('opentofu').update('languageServer.enable', true, scope);
      }),
      vscode.commands.registerCommand('tofu.disableLanguageServer', async () => {
        if (config('opentofu').get('languageServer.enable') === false) {
          return;
        }

        const scope: vscode.ConfigurationTarget = getScope('opentofu', 'languageServer.enable');

        await config('opentofu').update('languageServer.enable', false, scope);
      }),
    ];
  }

  dispose() {
    this.commands.forEach((c) => c.dispose());
  }
}
