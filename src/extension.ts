import * as vscode from 'vscode';
import { getModelHandle } from './modelProvider.js';
import { explainCode } from './explainCode';
import { reviewCode } from './reviewCode.js';
import { addComment } from './commentCreator.js';
import { extractKeyValuePairsAndCleanComment, processIncludedFiles, getCommentPatterns, identifyProgrammingLanguage, collectConsecutiveComments, extractQuestionFromMultiLine, findStartOfMultiLineComment } from './utils.js';
import { chatPromptGenerator, promptGenerator } from './promptBuilder.js';

export function activate(context: vscode.ExtensionContext) {

    let explainCommand = vscode.commands.registerCommand('copilotSupreme.explainCode', function () {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            // Call the function from explainCode.js
            explainCode(selectedText);
        }
    });

    context.subscriptions.push(explainCommand);

    let commentCommand = vscode.commands.registerCommand('copilotSupreme.addComment', function () {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            // Call the function from explainCode.js
            addComment(selectedText);
        }
    });

    context.subscriptions.push(commentCommand);

    let reviewCommand = vscode.commands.registerCommand('copilotSupreme.reviewCode', reviewCode);
    context.subscriptions.push(reviewCommand);

    // Listener for document changes
    vscode.workspace.onDidChangeTextDocument(async (event) => {
        const editor = vscode.window.activeTextEditor;
        const document = event.document;
        const changes = event.contentChanges;

        let patterns: any;
        if (editor) {
            const languageId = identifyProgrammingLanguage(editor);

            if (!languageId) {
                vscode.window.showErrorMessage(`Unsupported programming language or extension`);
                return;
            }
            patterns = getCommentPatterns(languageId);
        }


        if (changes.length === 0) { return; }

        const change = changes[0];
        const changedLineText = document.lineAt(change.range.start.line).text.trim();

        // Handle single-line comment
        if (changedLineText.startsWith(patterns.singleLine + ' @!') && change.text.includes('\n')) {
            const question = await collectConsecutiveComments(document, change.range.start.line, patterns.singleLine);
            const { keyValuePairs, cleanedComment: cleanedQuestion } = extractKeyValuePairsAndCleanComment(question);

            const provider = keyValuePairs['provider'] as string;
            const includes = keyValuePairs['include'] as string[];

            const { modelHandle, isChatModel }  = getModelHandle(provider);
            if (question) {
                await fetchCompletion(document, document.getText(), cleanedQuestion, change.range.start, modelHandle, isChatModel, includes);
            }
        }
        // Check for multi-line comment closure
        else if (changedLineText.includes(patterns.multiLineTrigger) && change.text.includes('\n')) {
            const startLine = await findStartOfMultiLineComment(document, change.range.start.line, patterns.multiLineStart, patterns.multiLineEnd);
            if (startLine !== -1) {
                const question = extractQuestionFromMultiLine(document, startLine, change.range.start.line, patterns.multiLineStart, patterns.multiLineEnd);
                if (question) {
                    const { keyValuePairs, cleanedComment: cleanedQuestion } = extractKeyValuePairsAndCleanComment(question);
                    const provider = keyValuePairs['provider'] as string;
                    const includes = keyValuePairs['include'] as string[];
                    const { modelHandle, isChatModel }  = getModelHandle(provider);
                    if (cleanedQuestion) {
                        await fetchCompletion(document, document.getText(), cleanedQuestion, change.range.start, modelHandle, isChatModel, includes);
                    }
                }
            }
        }
    });
    vscode.window.showInformationMessage('Copilot Supreme Activated');
}

// @! wrap function fetchCompletion in withProgress. Provide clean code only. provider=anthropic

async function fetchCompletion(document: vscode.TextDocument, contextText: string, cleanedQuestion: string, position: vscode.Position, localModel: any, isChatModel: boolean, includes?: string[]) {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Asking LLM...",
        cancellable: false
    }, async (progress) => {
        try {
            const includesArray: string[] = typeof includes === 'string' ? [includes] : includes;
            
            const  includedFilesContent = includesArray ? await processIncludedFiles(includesArray) : undefined;
            
            const fileName = vscode.workspace.asRelativePath(document.uri);

                // Create the user message content
            const userMessage = `
            FileName: ${fileName}
            ${includedFilesContent ? `Included Files Content:\n${includedFilesContent}\n` : ""}
            Current-Code: ${contextText}
            Question: ${cleanedQuestion}
            `;
            const messages = isChatModel ? chatPromptGenerator(userMessage, 'code') : 
                        promptGenerator(userMessage, 'code');
            
            const response = await localModel.invoke(messages);
            let parsedResponse: any;
            let completionText: string;
            try {
                parsedResponse = JSON.parse(response.content);
                if (parsedResponse.type === "README" && parsedResponse.content) {
                    completionText = parsedResponse.content;
                } else if (parsedResponse.type === "code" && parsedResponse.code) {
                    completionText = parsedResponse.code;
                } else {
                    vscode.window.showErrorMessage(`Incorrect response JSON: ${parsedResponse}`);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Incorrect response format`);
            }
            if (completionText) {
                const edit = new vscode.WorkspaceEdit();
                edit.insert(document.uri, position.translate(1, 0), `\n${completionText}`);
                await vscode.workspace.applyEdit(edit);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch completion: ${error}`);
        }
    });
}


export function deactivate() { }
