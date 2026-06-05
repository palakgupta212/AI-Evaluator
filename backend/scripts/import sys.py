import sys

# Define the mapping from code to letter
code_to_letter = {
    "._": "A",
    "_...": "B",
    ".." : "C",
    "_..": "D",
    ".": "E",
    ".._.": "F",
    "__.": "G",
    "....": "H",
    "..": "I",
    "._": "J",
    ".": "K",
    "._..": "L",
    "__": "M",
    "_.": "N",
    "_": "O",
    ".__.": "P",
    "_.": "Q",
    "._." : "R",
    "...": "S",
    "_": "T",
    ".._": "U",
    "..._": "V",
    ".__": "W",
    "..": "X",
    "._": "Y",
    "__..": "Z"
}

def find_decodings(s, code_to_letter):
    def helper(index):
        if index == len(s):
            return [""]
        results = []
        for code in code_to_letter:
            if s.startswith(code, index):
                for rest in helper(index + len(code)):
                    results.append(code_to_letter[code] + rest)
        return results
    decodings = helper(0)
    return sorted(decodings)

# Read input from stdin
input_str = input().strip()

# Find and print all decodings
decodings = find_decodings(input_str, code_to_letter)
for decoding in decodings:
    print(decoding)