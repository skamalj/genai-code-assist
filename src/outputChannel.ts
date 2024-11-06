// outputChannel.ts
import * as vscode from 'vscode';

const outputChannel = vscode.window.createOutputChannel('Copilot Supreme');
let debugEnabled = vscode.workspace.getConfiguration('genai.assistant').get<boolean>('enableDebug', false);

// Function to log messages with optional debug flag
export function logMessage(message: string): void {
    if (debugEnabled) {
        outputChannel.appendLine(`Copilot Supreme:\n${message}\n\n`);
        outputChannel.show();
    }
}

// Listen for changes to the debug setting
export function initializeConfigurationListener() {
    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('genai.assistant.enableDebug')) {
            debugEnabled = vscode.workspace.getConfiguration('genai.assistant').get<boolean>('enableDebug', false);
        }
    });
}

// Export the output channel for direct access
export { outputChannel };
