# vscode-php-cs-fixer

This extension adds support for running `php-cs-fixer fix` on PHP files in Visual Studio Code.
It's a fork (and a further development) of https://github.com/fterrag/vscode-php-cs-fixer which has been discontinued. 

![demo](https://github.com/danielzzz/vscode-php-cs-fixer/raw/master/demo.gif)

## Getting Started

As long as PHP 5.6+ is installed on your system and in your PATH, the extension should work out of the box.

If you don't want to use the `php-cs-fixer` that's included with the extension, set the `vscode-php-cs-fixer.toolPath` setting to the path of `php-cs-fixer`.

## File reading order

This extension tries to will try to read directories recursively upwards in order to find both the config file and the php-cs-fixer binary to use

## Extension Settings

This extension contributes the following settings:

* `vscode-php-cs-fixer.toolPath`: The path to the php-cs-fixer tool. It can be multiple for example "php-cs-fixer.phar,/home/me/php-cs-fixer.phar" and will use the first found (default: "", using the one provided with the extension)
* `vscode-php-cs-fixer.useCache`: Use a cache file when fixing files (--using-cache) (default: false)
* `vscode-php-cs-fixer.allowRisky`: Determines whether risky rules are allowed (--allow-risky) (default: false)
* `vscode-php-cs-fixer.config`: Path to a .php_cs file, it can take multiple and will use the first found (--config) (default: "")
* `vscode-php-cs-fixer.rules`: Rules to use when fixing files (--rules) (default: "@PSR1,@PSR2,@Symfony,-yoda_style")
* `vscode-php-cs-fixer.fixOnSave`: Runs fix command on save (default: true)
* `vscode-php-cs-fixer.intersection`: Set path mode to intersection (--pathmode=intersection) (default: false)
