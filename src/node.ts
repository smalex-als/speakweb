import { Md5 } from 'ts-md5/dist/md5';

export class Node {
    public container: HTMLElement;
    public tagName: string;
    public next: Node | null = null;
    public prev: Node | null = null;
    public tree: Tree;
    public hash: string = "";
    public addPause: boolean = false;
    public voiceName: string = "";
    public skipNode: boolean = false;

    constructor(tree: Tree, tagName: string, str: string = "", private appendTo?: HTMLElement) {
        this.tree = tree;
        this.tagName = tagName;
        this.container = document.createElement(tagName);
        this.container.innerHTML = str;
        if (this.appendTo instanceof HTMLElement) {
            this.appendTo.append(this.container);
        }
        if (tagName == "span") {
            this.hash = Md5.hashAsciiStr(str);
        }
    }

    findNext(): Node | null {
        var cur = this.next;
        while (cur != null && cur.tagName != "span") {
            cur = cur.next;
        }
        return cur;
    }

    findPrev(): Node | null {
        var cur = this.prev;
        while (cur != null && (cur.tagName != "span" || cur.skipNode)) {
            cur = cur.prev;
        }
        return cur;
    }

    findPrevLevelUp(): Node | null {
        var cur = this.prev;
        while (cur != null && cur.tagName != "p" && !cur.tagName.startsWith("h")) {
            cur = cur.prev;
        }
        if (cur != null) {
            cur = cur.prev;
            while (cur != null && cur.tagName != "p" && !cur.tagName.startsWith("h")) {
                cur = cur.prev;
            }
            if (cur != null) {
                if (cur.tagName.startsWith("h")) {
                    return cur;
                }
                return cur.findNext();
            }
        }
        return null;
    }

    findNextLevelUp(): Node | null {
        var cur = this.next;
        while (cur != null && cur.tagName != "p" && !cur.tagName.startsWith("h")) {
            cur = cur.next;
        }
        if (cur != null) {
            return cur.findNext();
        }
        return null;
    }
}

export class Tree {
    public root: Node | null = null;
    public last: Node | null = null;

    constructor() {
    }

    appendChild(node: Node) {
        if (this.last != null) {
            this.last.next = node;
            node.prev = this.last;
        }
        this.last = node;
        if (this.root == null) {
            this.root = node;
        }
    }
}