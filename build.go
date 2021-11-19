// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

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
	"path"
	"regexp"
	"strings"
)

const SrcDirName = "./html/"
const DstDirName = "./output/"
const PagesDirName = "pages/"
const FontsDirName = "assets/fonts/"
const BgmDirName = "assets/bgm/"
const ImagesDirName = "assets/images/"
const StylesDirName = "assets/styles/"
const ScriptsDirName = "assets/scripts/"

var IndexHtmlStyleRegex = regexp.MustCompile(`\n\s*<link\s+href="dep/normalize\.css/normalize\.css"\s+rel="stylesheet"\s+type="text/css"\s+/>\s*\n`)
var IndexHtmlScriptRegex = regexp.MustCompile(`[ \t]*<script\s+defer\s+src="([^"]+)"\s*></script\s*>\s*\n`)

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
	os.MkdirAll(path.Join(DstDirName, PagesDirName), 0755)
	os.MkdirAll(path.Join(DstDirName, FontsDirName), 0755)
	os.MkdirAll(path.Join(DstDirName, BgmDirName), 0755)
	os.MkdirAll(path.Join(DstDirName, ImagesDirName), 0755)
	os.MkdirAll(path.Join(DstDirName, StylesDirName), 0755)
	os.MkdirAll(path.Join(DstDirName, ScriptsDirName), 0755)

	fmt.Println("> Copying fonts...")
	copyDir(FontsDirName)

	fmt.Println("> Copying pages...")
	copyDir(PagesDirName)

	fmt.Println("> Copying index.css...")
	copyFile("assets/styles/index.css")

	fmt.Println("> Minifying index.css...")
	minifyCss("index.css")

	fmt.Println("> Copying pages.css...")
	copyFile("assets/styles/pages.css")

	fmt.Println("> Minifying pages.css...")
	minifyCss("pages.css")

	buildIndexJs()
	buildIndexHtml()

	fmt.Println("> Copying tech-blocker-1.js...")
	copyFile(path.Join(ScriptsDirName, "tech-blocker-1.js"))
	fmt.Println("> Minifying tech-blocker-1.js...")
	minifyJs("tech-blocker-1.js")

	fmt.Println("> Copying tech-blocker-2.js...")
	copyFile(path.Join(ScriptsDirName, "tech-blocker-2.js"))
	fmt.Println("> Minifying tech-blocker-2.js...")
	minifyJs("tech-blocker-2.js")

	fmt.Println("> Copying robots.txt...")
	copyFile("robots.txt")

	fmt.Println("> Copying favicon.png...")
	copyFile("favicon.png")

	fmt.Println("> Copying bgm...")
	copyDir(BgmDirName)

	fmt.Println("> Copying images...")
	copyDir(ImagesDirName)
}

func buildIndexJs() {
	fmt.Println("> Reading index.html for index.js building...")
	srcIndexHtml := readFile("index.html")

	dstIndexJs := ""

	for _, match := range IndexHtmlScriptRegex.FindAllStringSubmatch(srcIndexHtml, -1) {
		fileName := match[1]
		fmt.Println("> Reading " + fileName + " into memory...")
		dstIndexJs += readFile(fileName)
	}

	dstIndexJs = ensureDebugFalse(dstIndexJs)

	fmt.Println("> Writing concatenated index.js...")
	writeFile(path.Join(ScriptsDirName, "index.js"), dstIndexJs)

	fmt.Println("> Minifying index.js...")
	minifyIndexJs("index.js")
}

func buildIndexHtml() {
	fmt.Println("> Reading index.html for building...")
	srcIndexHtml := readFile("index.html")
	dstIndexHtml := srcIndexHtml

	dstIndexHtml = IndexHtmlStyleRegex.ReplaceAllString(dstIndexHtml, "\n")

	for _, match := range IndexHtmlScriptRegex.FindAllStringSubmatch(dstIndexHtml, -1) {
		if match[1] == "assets/scripts/index.js" {
			continue
		}

		dstIndexHtml = strings.Replace(dstIndexHtml, match[0], "", 1)
	}

	fmt.Println("> Writing index.html...")
	writeFile("index.html", dstIndexHtml)
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

func copyDir(pathAndName string) {
	fileInfos, err := ioutil.ReadDir(path.Join(SrcDirName, pathAndName))

	if err != nil {
		panic("Failed to list " + path.Join(SrcDirName, pathAndName))
	}

	for _, fileInfo := range fileInfos {
		if fileInfo.IsDir() {
			destPath := path.Join(pathAndName, fileInfo.Name())
			os.MkdirAll(path.Join(DstDirName, destPath), 0755)
			copyDir(destPath)
		} else {
			_copyFile(path.Join(SrcDirName, pathAndName, fileInfo.Name()), path.Join(DstDirName, pathAndName, fileInfo.Name()))
		}
	}
}

func copyFile(pathAndName string) {
	_copyFile(path.Join(SrcDirName, pathAndName), path.Join(DstDirName, pathAndName))
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
	content, err := ioutil.ReadFile(path.Join(SrcDirName, srcPath))

	if err != nil {
		panic(err)
	}

	return string(content)
}

func writeFile(dstPath string, content string) {
	err := ioutil.WriteFile(path.Join(DstDirName, dstPath), []byte(content), 0644)
	if err != nil {
		panic(err)
	}
}

func minifyCss(dstPath string) {
	fileName := path.Join(DstDirName, StylesDirName, dstPath)
	cmd := exec.Command("npx", "cleancss", "-o", fileName, fileName)
	runAndCheckCmd(cmd)
}

func minifySrcCssIntoString(srcPath string) string {
	fileName := path.Join(SrcDirName, StylesDirName, srcPath)
	cmd := exec.Command("npx", "cleancss", fileName)
	return runAndGetCmdOutput(cmd)
}

func minifyJs(dstPath string) {
	fileName := path.Join(DstDirName, ScriptsDirName, dstPath)
	cmd := exec.Command("npx", "terser", "-c", "-m", "-o", fileName, fileName)
	runAndCheckCmd(cmd)
}

func minifyIndexJs(dstPath string) {
	fileName := path.Join(DstDirName, ScriptsDirName, dstPath)
	// UglifyJS doesn't know AbortController yet
	cmd := exec.Command(
		"npx", "terser",
		"--config-file", "./terser_config.json",
		"-o", fileName,
		fileName)
	runAndCheckCmd(cmd)
}

func ensureDebugFalse(content string) string {
	markRegex := regexp.MustCompile(`(?m)^\s*exports\.DEBUG\s*=\s*true;?$`)

	return markRegex.ReplaceAllString(content, "exports.DEBUG=false;")
}
