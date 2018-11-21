// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018 Min-Zhong Lu

// This is a bespoke builder that generates a folder of files suitable for serving
// on the internet, by copying/transforming the source html folder.
//
// The only transformation we do here is to concat and minify js / css files
// (sans the tech-blockers -- they have to stay in separate files or syntax errors
// on tech-blocker-2 will prevent tech-blocker-1 from executing). Files to concat &
// minify are retrieved from index.html. With that said, we're being lousy here:
// I'm not using a DOM parser, and only a line-by-line text parser for index.html.
// Not the most robust builder out there, but since index's structure and dependent
// files aren't really going to change structurally, let's give this a pass.
//
// I'm also making tons of assumptions (path names should always have a trailing
// slash, minifyXxx assumes files residing in Xxx directory, etc.).

package main

import (
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"os/exec"
	"regexp"
	"strings"
)

const SrcDirName = "./html/"
const DstDirName = "./output/"
const PagesDirName = "pages/"
const FontsDirName = "assets/fonts/"
const BgmDirName = "assets/bgm/"
const StylesDirName = "assets/styles/"
const ScriptsDirName = "assets/scripts/"

func main() {
	var cmd *exec.Cmd

	fmt.Println("> Generating glyph files...")
	cmd = exec.Command("go", "run", "./subset_generator.go")
	cmd.Dir = "./fonts"
	runAndCheckCmd(cmd)

	fmt.Println("> Generating subset fonts...")
	cmd = exec.Command("bash", "./build_fonts.sh")
	cmd.Dir = "./fonts"
	runAndCheckCmd(cmd)

	fmt.Println("> Preparing target direcory...")
	os.RemoveAll(DstDirName)
	os.MkdirAll(DstDirName, 0755)
	os.MkdirAll(DstDirName+PagesDirName, 0755)
	os.MkdirAll(DstDirName+FontsDirName, 0755)
	os.MkdirAll(DstDirName+BgmDirName, 0755)
	os.MkdirAll(DstDirName+StylesDirName, 0755)
	os.MkdirAll(DstDirName+ScriptsDirName, 0755)

	fmt.Println("> Copying fonts...")
	copyDir("assets/fonts/")

	fmt.Println("> Copying pages...")
	copyDir("pages/")

	fmt.Println("> Concatenating normalize.css + index.css...")
	srcNormalizeCss := readFile("dep/normalize.css/normalize.css")
	srcIndexCss := readFile(StylesDirName + "index.css")

	fmt.Println("> Writing index.css...")
	writeFile(StylesDirName+"index.css", srcNormalizeCss+srcIndexCss)

	fmt.Println("> Minifying index.css...")
	minifyCss("index.css")

	buildPagesCss()

	buildIndexJsAndHtml()

	fmt.Println("> Copying tech-blocker-1.js...")
	copyFile(ScriptsDirName + "tech-blocker-1.js")
	fmt.Println("> Minifying tech-blocker-1.js...")
	minifyJs("tech-blocker-1.js")

	fmt.Println("> Copying tech-blocker-2.js...")
	copyFile(ScriptsDirName + "tech-blocker-2.js")
	fmt.Println("> Minifying tech-blocker-2.js...")
	minifyJs("tech-blocker-2.js")

	fmt.Println("> Copying robots.txt...")
	copyFile("robots.txt")

	fmt.Println("> Copying favicon.png...")
	copyFile("favicon.png")

	fmt.Println("> Copying bgm...")
	copyDir("assets/bgm/")
}

func buildIndexJsAndHtml() {
	fmt.Println("> Reading index.html...")
	srcIndexHtml := readFile("index.html")

	dstIndexJs := ""
	dstIndexHtml := ""

	styleRegex := regexp.MustCompile(`^<link href="([^"]+)" rel="stylesheet" type="text/css" />$`)
	scriptRegex := regexp.MustCompile(`^<script defer src="([^"]+)"></script>$`)

	skipping := false
	for _, line := range strings.Split(srcIndexHtml, "\n") {
		trimmedLine := strings.TrimSpace(line)

		if skipping {
			goto done
		}

		if trimmedLine == "</head>" {
			skipping = true
			goto done
		}

		{
			styleMatch := styleRegex.FindStringSubmatch(trimmedLine)

			if styleMatch != nil {
				fileName := styleMatch[1]

				switch fileName {
				case "dep/normalize.css/normalize.css":
					fmt.Println("> Removed normalize.css line")
					continue
				case "assets/styles/index.css":
				default:
					panic("Unrecognized css line [" + fileName + "]")
				}

				goto done
			}
		}

		{
			scriptMatch := scriptRegex.FindStringSubmatch(trimmedLine)

			if scriptMatch != nil {
				fileName := scriptMatch[1]

				fmt.Println("> Reading " + fileName + " into memory...")
				dstIndexJs += readFile(fileName)

				switch fileName {
				case "assets/scripts/index.js":
				default:
					continue
				}

				goto done
			}
		}

	done:
		dstIndexHtml += line + "\n"
	}

	fmt.Println("> Writing index.html...")
	writeFile("index.html", dstIndexHtml)

	dstIndexJs = ensureDebugFalse(dstIndexJs)
	dstIndexJs = removeMarkedJs(dstIndexJs)

	fmt.Println("> Writing concatenated index.js...")
	writeFile(ScriptsDirName+"index.js", dstIndexJs)

	fmt.Println("> Minifying index.js...")
	minifyIndexJs("index.js")
}

// clean-css moves the placeholder comments from:
// property: /*!PLACERHOLDER*/value;
// to:
// property:value;/*!PLACERHOLDER*/
// So we need to reprocess a bit.
func buildPagesCss() {
	fmt.Println("> Minifying pages.css into memory...")
	minifiedPagesCss := minifySrcCssIntoString("pages.css")
	minifiedPagesCssRunes := []rune(minifiedPagesCss)

	fmt.Println("> Postprocessing placeholders...")

	rootDeclarationRegex := regexp.MustCompile(`:root\{[^}]+\}`)
	variableDefinitionsRegex := regexp.MustCompile(`(--[a-zA-z0-9\-]+:)([^/]+)(/[^/]+/)`)

	rootDeclarationIndexes := rootDeclarationRegex.FindStringSubmatchIndex(minifiedPagesCss)
	rootDeclarationStartIndex := rootDeclarationIndexes[0]
	rootDeclarationEndIndex := rootDeclarationIndexes[1]

	variableDefinitions := string(minifiedPagesCssRunes[rootDeclarationStartIndex:rootDeclarationEndIndex])

	postprocessedPagesCss := string(minifiedPagesCssRunes[:rootDeclarationStartIndex]) +
		variableDefinitionsRegex.ReplaceAllString(variableDefinitions, "$1$3$2") +
		string(minifiedPagesCssRunes[rootDeclarationEndIndex:])

	fmt.Println("> Writing pages.css...")
	writeFile(StylesDirName+"pages.css", postprocessedPagesCss)
}

func runAndCheckCmd(cmd *exec.Cmd) {
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	err := cmd.Run()

	if err != nil {
		panic(err)
	}
}

func runAndGetCmdOutput(cmd *exec.Cmd) string {
	output, err := cmd.Output()

	if err != nil {
		panic(err)
	}

	return string(output)
}

// No recursive copying for now
func copyDir(path string) {
	fileInfos, err := ioutil.ReadDir(SrcDirName + path)

	if err != nil {
		panic("Failed to list " + SrcDirName + path)
	}

	for _, fileInfo := range fileInfos {
		_copyFile(SrcDirName+path+fileInfo.Name(), DstDirName+path+fileInfo.Name())
	}
}

func copyFile(path string) {
	_copyFile(SrcDirName+path, DstDirName+path)
}

func _copyFile(srcPath string, dstPath string) {
	srcFile, err := os.Open(srcPath)
	if err != nil {
		panic(err)
	}
	defer srcFile.Close()

	dstFile, err := os.Create(dstPath)
	if err != nil {
		panic(err)
	}
	defer dstFile.Close()

	_, err = io.Copy(dstFile, srcFile)
	if err != nil {
		panic(err)
	}
}

func readFile(srcPath string) string {
	content, err := ioutil.ReadFile(SrcDirName + srcPath)

	if err != nil {
		panic(err)
	}

	return string(content)
}

func writeFile(dstPath string, content string) {
	err := ioutil.WriteFile(DstDirName+dstPath, []byte(content), 0644)
	if err != nil {
		panic(err)
	}
}

func minifyCss(dstPath string) {
	fileName := DstDirName + StylesDirName + dstPath
	cmd := exec.Command("./node_modules/clean-css-cli/bin/cleancss", "-o", fileName, fileName)
	runAndCheckCmd(cmd)
}

func minifySrcCssIntoString(srcPath string) string {
	fileName := SrcDirName + StylesDirName + srcPath
	cmd := exec.Command("./node_modules/clean-css-cli/bin/cleancss", fileName)
	return runAndGetCmdOutput(cmd)
}

func minifyJs(dstPath string) {
	fileName := DstDirName + ScriptsDirName + dstPath
	cmd := exec.Command("./node_modules/uglify-es/bin/uglifyjs", "-c", "-m", "-o", fileName, fileName)
	runAndCheckCmd(cmd)
}

func minifyIndexJs(dstPath string) {
	fileName := DstDirName + ScriptsDirName + dstPath
	// UglifyJS doesn't know AbortController yet
	cmd := exec.Command(
		"./node_modules/uglify-es/bin/uglifyjs",
		"-c",
		"-m",
		"--mangle-props", `regex=/^(?!\$.*$).*/,reserved=['aborted', 'signal', 'Latin', 'CJK', 'medium', 'low', 'loud', 'silent', 'dppx', 'widthDots', 'paddingTop', 'paddingHorizontal', 'paddingBottom', 'pMarginBottom', 'fontSize', 'lineHeight', 'raining', '_raining', '_loading', '_audioAvailable', '_volumeLevel', '_currentPage']`,
		"-o", fileName,
		fileName)
	runAndCheckCmd(cmd)
}

func removeMarkedJs(content string) string {
	markRegex := regexp.MustCompile(`(?s)/\*<BUILD_REMOVAL>\*/.*?/\*</BUILD_REMOVAL>\*/`)

	return markRegex.ReplaceAllString(content, "")
}

func ensureDebugFalse(content string) string {
	markRegex := regexp.MustCompile(`(?m)^Object\.defineProperty\(exports,\s*'DEBUG',\s*{\s*value:\s*true\s*}\s*\);?$`)

	return markRegex.ReplaceAllString(content, "Object.defineProperty(exports, 'DEBUG', {value: false});")
}
