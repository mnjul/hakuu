// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

// No DOM parser here yet.

package main

import (
	"io/ioutil"
	"path"
	"regexp"
	"sort"
	"unicode"
)

type RuneSlice []rune

func (runes RuneSlice) Len() int               { return len(runes) }
func (runes RuneSlice) Less(a int, b int) bool { return runes[a] < runes[b] }
func (runes RuneSlice) Swap(a int, b int)      { runes[a], runes[b] = runes[b], runes[a] }

func main() {
	cjk_chars := make(map[rune]bool)
	cjk_puncs := make(map[rune]bool)
	latin_chars := make(map[rune]bool)
	cjk_sans_chars := make(map[rune]bool)
	cjk_sans_puncs := make(map[rune]bool)
	latin_sans_chars := make(map[rune]bool)

	parseHTML("../html/index.html", cjk_chars, cjk_puncs, latin_chars, cjk_sans_chars, cjk_sans_puncs, latin_sans_chars)

	htmlFileInfos, err := ioutil.ReadDir("../html/pages/")
	if err != nil {
		panic("fail to list pages")
	}
	for _, fileInfo := range htmlFileInfos {
		parseHTML(path.Join("../html/pages/", fileInfo.Name()), cjk_chars, cjk_puncs, latin_chars, cjk_sans_chars, cjk_sans_puncs, latin_sans_chars)
	}

	cssFileInfos, err := ioutil.ReadDir("../html/assets/styles/")
	if err != nil {
		panic("fail to list styles")
	}
	for _, fileInfo := range cssFileInfos {
		parseCSS(path.Join("../html/assets/styles/", fileInfo.Name()), cjk_chars, cjk_puncs, latin_chars, cjk_sans_chars, cjk_sans_puncs, latin_sans_chars)
	}

	// retain these for use in japanese content; pyftmerge will assign locl feature
	// and we use html lang attribute to activate these variations
	cjk_chars['、'] = true
	cjk_chars['。'] = true

	writeSubsetFile(latin_chars, "./charsets/latin.txt")
	writeSubsetFile(cjk_chars, "./charsets/cjk.txt")
	writeSubsetFile(cjk_puncs, "./charsets/cjk_punctuation.txt")
	writeSubsetFile(latin_sans_chars, "./charsets/latin-sans.txt")
	writeSubsetFile(cjk_sans_chars, "./charsets/cjk-sans.txt")
	writeSubsetFile(cjk_sans_puncs, "./charsets/cjk-sans_punctuation.txt")
}

func parseHTML(filepath string, cjk_chars map[rune]bool, cjk_puncs map[rune]bool, latin_chars map[rune]bool, cjk_sans_chars map[rune]bool, cjk_sans_puncs map[rune]bool, latin_sans_chars map[rune]bool) {
	content, err := ioutil.ReadFile(filepath)

	if err != nil {
		panic("failed to open " + filepath)
	}

	re := regexp.MustCompile("(?s)<blockquote.+?</blockquote")
	for _, quote_content := range re.FindAllString(string(content), -1) {
		parse([]byte(quote_content), cjk_sans_chars, cjk_sans_puncs, latin_sans_chars)
	}

	content_without_quote := re.ReplaceAllLiteralString(string(content), "")
	parse([]byte(content_without_quote), cjk_chars, cjk_puncs, latin_chars)
}

func parseCSS(filepath string, cjk_chars map[rune]bool, cjk_puncs map[rune]bool, latin_chars map[rune]bool, cjk_sans_chars map[rune]bool, cjk_sans_puncs map[rune]bool, latin_sans_chars map[rune]bool) {
	content, err := ioutil.ReadFile(filepath)

	if err != nil {
		panic("failed to open " + filepath)
	}

	parse(content, cjk_chars, cjk_puncs, latin_chars)
	parse(content, cjk_sans_chars, cjk_sans_puncs, latin_sans_chars)
}

func parse(content []byte, cjk_chars map[rune]bool, cjk_puncs map[rune]bool, latin_chars map[rune]bool) {
	for _, char := range string(content) {
		if char <= unicode.MaxLatin1 || isLatinFontChar(char) {
			latin_chars[char] = true
		} else if isCJKPunc(char) {
			cjk_puncs[char] = true
		} else {
			cjk_chars[char] = true
		}
	}
}

func writeSubsetFile(chars map[rune]bool, filepath string) {
	var runes []rune

	for char, _ := range chars {
		runes = append(runes, char)
	}

	sort.Sort(RuneSlice(runes))

	err := ioutil.WriteFile(filepath, []byte(string(runes)), 0644)

	if err != nil {
		panic("failed to write " + filepath)
	}
}

func isLatinFontChar(char rune) bool {
	switch char {
	case '“', '”', '‘', '’':
		return true
	}
	return false
}

func isCJKPunc(char rune) bool {
	switch char {
	case '–', '（', '）', '，', '－', '：', '；', '？', '！', '＆', '—', '＿', '～', '、', '。', '「', '」', '『', '』', '…', '．', '／':
		return true
	}
	return false
}
