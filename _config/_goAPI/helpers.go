package main

import "strings"

// EndsWithSubstring returns true if value exists in arr
func EndsWithSubstring(arr []string, value string) bool {
	for _, v := range arr {
		if strings.HasSuffix(value, v) {
			return true
		}
	}
	return false
}

// ContainsSubString returns true if value exists in arr
// arr are assumed to contain the substrings of value
func ContainsSubString(arr []string, value string) bool {
	for _, v := range arr {
		if strings.Contains(value, v) {
			return true
		}
	}
	return false
}
