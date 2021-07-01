import { Node, Tree } from "./node";

export function dbWikiTextToHtml(body: string): Tree {
    body = body.replace(/\\n/g, "\n");
    body = body.replace(/\n{3,}/g, "\n\n");
    var tree = new Tree();
    var rootNode = new Node(tree, "div");
    tree.appendChild(rootNode);
    for (let para of body.split('\n\n')) {
        para = para.trim();
        para = para.replace(/'''([^']*)'''/g, "<b>$1</b>");
        para = processHeadlines(para, rootNode, tree);
        para = processIndent(para, rootNode, tree);
        para = para.replace(/\n/g, " ");
        para = para.trim();
        if (para.length == 0) {
            continue;
        }
        var paragraph = new Node(tree, 'p', "", rootNode.container);
        tree.appendChild(paragraph);
        processSentenses(para, paragraph, tree);
    }
    return tree;
}

function processSentenses(para: string, parentNode: Node, tree: Tree) {
    let first = true;
    let voiceName = "";
    do {
        var m = para.match(/^([^:.!?]*[:.!?]\s*)/);
        if (m) {
            var span = new Node(tree, "span", m[0], parentNode.container);
            span.addPause = first;
            var matchVoice = m[0].trim().match(/^([A-Z]+):/);
            if (matchVoice) {
                voiceName = matchVoice[1];
                span.skipNode = true;
            }
            span.voiceName = voiceName;
            tree.appendChild(span);
            para = para.substr(m[0].length)
            // para = para.trimLeft();
        } else {
            var span = new Node(tree, "span", para, parentNode.container);
            tree.appendChild(span);
            break;
        }
        first = false;
    } while (true && para.length > 0);
}

function processHeadlines(para: string, rootNode: Node, tree: Tree): string {
    while (para.startsWith('=')) {
        var m = para.match(/^(={2,})([^=]*)(={2,})$/m)
        if (!m) {
            break;
        }
        if (m[1] != m[3]) {
            break;
        }
        var node = new Node(tree, 'h' + m[1].length, "", rootNode.container);
        tree.appendChild(node);
        tree.appendChild(new Node(tree, "span", m[2].trim(), node.container));

        para = para.substr(m[0].length);
        para = para.trimLeft();
    }
    return para;
}

function processIndent(para: string, rootNode: Node, tree: Tree): string {
    while (para.startsWith(':')) {
        var m = para.match(/^(:+)(.*)$/m)
        if (!m) {
            break;
        }
        var cnt = m[1].length;
        var node: Node = rootNode;
        for (var i = 0; i < cnt; i++) {
            var newnode: Node = new Node(tree, 'dl', "", node.container);
            node = newnode;

            newnode = new Node(tree, 'dd', "", node.container);
            node = newnode;
        }
        if (node) {
            processSentenses(m[2], node, tree);
        }
        para = para.substr(m[0].length);
        para = para.trimLeft();
    }
    return para;
}

export function isElementInViewport(el: HTMLElement) {
  var rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
