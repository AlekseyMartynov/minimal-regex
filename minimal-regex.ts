// https://github.com/AlekseyMartynov/minimal-regex

type AffixTableItem = [
    isPostfix: boolean,
    affix: string,
    childWords: string[],
    rank: number
];

const TERMINATOR = "\xa0";
const MIN_AFFIX_LEN = 3;
const NON_CAPTURING_GROUP = true;

function minimalRegex(words: readonly string[]): string {
    if (words.length === 1) {
        return escape(words[0]);
    }

    const triePre = {};
    const triePost = {};

    for (const word of words) {
        trieInsert(triePre, word);
        trieInsert(triePost, reverse(word));
    }

    trieCompress(triePre);
    trieCompress(triePost);

    const affixDictPre = {};
    const affixDictPost = {};

    trieCollectAffixes(triePre, false, affixDictPre);
    trieCollectAffixes(triePost, true, affixDictPost);

    const affixTable = new Array<AffixTableItem>;

    addAffixDictToAffixTable(affixDictPre, affixTable, false);
    addAffixDictToAffixTable(affixDictPost, affixTable, true);

    affixTable.sort((x, y) => y[3] - x[3]);
    affixTable.push([false, "", [], 0]);

    for (const word of words) {
        for (const [isPostfix, affix, childWords] of affixTable) {
            if (!isPostfix && word.startsWith(affix)) {
                childWords.push(word.substring(affix.length));
                break;
            }
            if (isPostfix && word.endsWith(affix)) {
                childWords.push(word.substring(0, word.length - affix.length));
                break;
            }
        }
    }

    let pattern = "(";
    if (NON_CAPTURING_GROUP) {
        pattern += "?:";
    }

    let first = true;

    for (const [isPostfix, affix, childWords] of affixTable) {
        if (!childWords.length) {
            continue;
        }
        if (!first) {
            pattern += "|";
        }
        if (affix.length < 1) {
            pattern += childWords.map(escape).join("|");
        } else {
            if (isPostfix) {
                pattern += minimalRegex(childWords) + escape(affix);
            } else {
                pattern += escape(affix) + minimalRegex(childWords);
            }
        }
        first = false;
    }

    pattern += ")";

    return pattern;
}

function reverse(text: string): string {
    return text.split("").reverse().join("");
}

function escape(text: string): string {
    // TODO
    return text.split(".").join("\\.");
}

function trieInsert(trie: object, word: string): void {
    for (const ch of word) {
        trie[ch] = trie[ch] || {};
        trie = trie[ch];
    }
    trie[TERMINATOR] = null;
}

function trieCompress(trie: object): void {
    // https://en.wikipedia.org/wiki/Radix_tree

    const keys = Object.keys(trie);

    for (const key of keys) {
        if (key === TERMINATOR) {
            continue;
        }

        const childTrie = trie[key];
        trieCompress(childTrie);

        const childKeys = Object.keys(childTrie);
        if (childKeys.length > 1) {
            continue;
        }

        const onlyChildKey = childKeys[0];
        if (onlyChildKey === TERMINATOR) {
            continue;
        }

        const newKey = key + onlyChildKey;
        trie[newKey] = childTrie[onlyChildKey];
        delete trie[key];
    }
}

function trieCollectAffixes(trie: object, isReversed: boolean, outputDict: Record<string, number>, path?: string[]) {
    path = path || [];

    for (const key of Object.keys(trie)) {
        if (key === TERMINATOR) {
            let affix = "";
            for (const pathItem of path) {
                if (isReversed) {
                    affix = reverse(pathItem) + affix;
                } else {
                    affix += pathItem;
                }
                if (affix.length >= MIN_AFFIX_LEN) {
                    outputDict[affix] = 1 + (outputDict[affix] | 0);
                }
            }
        } else {
            path.push(key);
            trieCollectAffixes(trie[key], isReversed, outputDict, path);
            path.pop();
        }
    }
}

function addAffixDictToAffixTable(dict: Record<string, number>, table: AffixTableItem[], isPostfix: boolean) {
    for (const affix of Object.keys(dict)) {
        const count = dict[affix];
        if (count > 1) {
            const rank = affix.length * count;
            table.push([isPostfix, affix, [], rank]);
        }
    }
}

export = minimalRegex;

// export default minimalRegex; // njs
