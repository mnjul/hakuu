// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018 Min-Zhong Lu

// No DOM parser here yet.

package main

import (
	"io/ioutil"
	"sort"
	"unicode"
)

type RuneSlice []rune

func (runes RuneSlice) Len() int               { return len(runes) }
func (runes RuneSlice) Less(a int, b int) bool { return runes[a] < runes[b] }
func (runes RuneSlice) Swap(a int, b int)      { runes[a], runes[b] = runes[b], runes[a] }

func main() {
	cjk_chars := make(map[rune]bool)
	latin_chars := make(map[rune]bool)

	parseFile("../html/index.html", cjk_chars, latin_chars)

	for _, path := range []string{"../html/pages/", "../html/assets/styles/"} {
		fileInfos, err := ioutil.ReadDir(path)

		if err != nil {
			panic("fail to list " + path)
		}

		for _, fileInfo := range fileInfos {
			parseFile(path+fileInfo.Name(), cjk_chars, latin_chars)
		}
	}

	writeSubsetFile(latin_chars, "./charsets/latin.txt")
	writeSubsetFile(cjk_chars, "./charsets/cjk.txt")

}

func parseFile(filepath string, cjk_chars map[rune]bool, latin_chars map[rune]bool) {
	content, err := ioutil.ReadFile(filepath)

	if err != nil {
		panic("failed to open " + filepath)
	}

	for _, char := range string(content) {
		if char <= unicode.MaxLatin1 || isLatinFontChar(char) {
			latin_chars[char] = true
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
	case '“', '”':
		return true
	}
	return false
}
