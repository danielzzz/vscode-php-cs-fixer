const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const tmp = require('tmp');
const cp = require('child_process');
const { config } = require('process');
let logMessages = [];
log('PhpCsFixer extension started');

function log(msg) {
    logMessages.push(msg);
}

function dumpLog() {
    const output = vscode.window.createOutputChannel('Tasks');
    output.show();
    logMessages.forEach(msg => output.appendLine(msg));
    logMessages = [];
}


function formatDocument(document) {
    if (document.languageId !== 'php') {
        return;
    }

    const filename = document.fileName;
    const opts = { cwd: path.dirname(filename) };

    const toolPath = getToolPath(opts.cwd);
    log('php-cs-fixer: ' + toolPath);

    // allow to have multiple config files separated by comma:
    // php-cs-fixer.php,php_cs.dist 
    // which allows to use different file names per project (legacy dependency)
    const configFile = getConfigFile(opts.cwd);
    log('config: ' + configFile);

    // create a temp file
    const tmpFile = tmp.fileSync();
    const originalText = document.getText(null);
    fs.writeFileSync(tmpFile.name, originalText);

    const args = makeArgs(toolPath, configFile, tmpFile.name)

    return new Promise(function (resolve) {
        log('execute: php ' + args.join(' '));
        cp.execFile('php', args, opts, function (err, stdout, stderr) {
            log("\nPHPCsFixer error");
            log(err.cmd);
            log(stderr);
            if (err) {
                tmpFile.removeCallback();
                vscode.window.showErrorMessage('There was an error while running php-cs-fixer. Please check the console output for more info');
                dumpLog();
                resolve(originalText);

                return;
            }

            const text = fs.readFileSync(tmpFile.name, 'utf-8');
            tmpFile.removeCallback();
            log("done");
            resolve(text);
        });
    });
}

function makeArgs(toolPath, configPath, filePath) {
    let args = [];

    args.push(toolPath);
    args.push('fix');

    if (!getConfig('useCache')) {
        args.push('--using-cache=no');
    }

    if (getConfig('allowRisky')) {
        args.push('--allow-risky=yes');
    }

    if (getConfig('intersection')) {
        args.push('--path-mode=intersection');
    }

    let config = getConfig('config');
    if (config) {
        // Support config file with relative path
        if (!path.isAbsolute(config)) {
            let currentPath = opts.cwd;
            let triedPaths = [currentPath];
            while (!fs.existsSync(currentPath + path.sep + config)) {
                let lastPath = currentPath;
                currentPath = path.dirname(currentPath);
                if (lastPath == currentPath) {
                    vscode.window.showErrorMessage(`Unable to find ${config} file in ${triedPaths.join(", ")}`);
                    return;
                } else {
                    triedPaths.push(currentPath);
                }
            }
            config = currentPath + path.sep + config;
        }

        if (!configPath) {
            // log("config file not found. adding rules")
            let rules = getConfig('rules');
            if (rules) {
                args.push('--rules=' + rules);
            }
        }

        args.push(filePath);

        return args;
    }

    function getConfigFile(basePath) {
        let fileNames = getConfig('config').split(',');
        let configFile;
        try {
            configFile = getFilePath(fileNames, basePath);
        } catch (e) {
            vscode.window.showErrorMessage(e);
        }
        return configFile;
    }

    function getToolPath(basePath) {
        const defaultPath = vscode.extensions.getExtension('fterrag.vscode-php-cs-fixer').extensionPath + '/php-cs-fixer';
        let pathConfig = getConfig('toolPath');

        if (!pathConfig) {
            return defaultPath;
        }

        let toolPaths = pathConfig.split(',');
        let toolPath = getFilePath(toolPaths, basePath);

        if (!toolPath) {
            return defaultPath;
        }

        return toolPath;
    }


    function absoluteExists(filePath) {
        return path.isAbsolute(filePath) && fs.existsSync(filePath);
    }

    /**
     * finds if any of filenames exists in basePath and parent directories
     * and returns the path
     * @param {array} fileNames 
     * @param {string} basePath 
     * @returns string | undefined
     */
    function getFilePath(fileNames, basePath) {
        if (fileNames.length === 0) {
            return undefined;
        }

        let currentPath;
        let currentFile;
        let triedPaths;
        let foundPath;

        for (let i = 0; i < fileNames.length; i++) {
            currentFile = fileNames[i];

            // log(currentFile);
            if (absoluteExists(currentFile)) {
                // log('found absolute');
                return currentFile;
            }

            currentPath = basePath;
            triedPaths = [currentPath];
            while (!fs.existsSync(currentPath + path.sep + currentFile)) {
                let lastPath = currentPath;
                currentPath = path.resolve(currentPath, '..');
                // log(currentPath);
                // log(lastPath + ":" + currentPath);
                if (lastPath === currentPath) {
                    // log('not found');
                    break;
                } else {
                    triedPaths.push(currentPath);
                }
            }

            foundPath = currentPath + path.sep + currentFile;
            // log(foundPath);
            if (fs.existsSync(foundPath)) {
                // log('really found ' + foundPath);
                return foundPath;
            }
        };

        return undefined;
    }

    function registerDocumentProvider(document, options) {
        return new Promise(function (resolve, reject) {
            formatDocument(document).then(function (text) {
                const range = new vscode.Range(new vscode.Position(0, 0), document.lineAt(document.lineCount - 1).range.end);
                resolve([new vscode.TextEdit(range, text)]);
            }).catch(function (err) {
                reject();
            });
        });
    }

    function getConfig(key) {
        return vscode.workspace.getConfiguration('vscode-php-cs-fixer').get(key);
    }

    function activate(context) {
        context.subscriptions.push(vscode.commands.registerTextEditorCommand('vscode-php-cs-fixer.fix', function (textEditor) {
            vscode.commands.executeCommand('editor.action.formatDocument');
        }));

        context.subscriptions.push(vscode.workspace.onWillSaveTextDocument(function (event) {
            if (event.document.languageId === 'php' && getConfig('fixOnSave') && vscode.workspace.getConfiguration('editor', null).get('formatOnSave') == false) {
                event.waitUntil(vscode.commands.executeCommand('editor.action.formatDocument'));
            }
        }));

        context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider('php', {
            provideDocumentFormattingEdits: function (document, options) {
                return registerDocumentProvider(document, options);
            }
        }));
    }

    exports.activate = activate;

    function deactivate() {
    }

    exports.deactivate = deactivate;
