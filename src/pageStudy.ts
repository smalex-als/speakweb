import "firebase/firestore";
import "firebase/storage";
import "firebase/functions";
import "firebase/auth";
import { Md5 } from 'ts-md5/dist/md5';

import Page from "./page";
import firebase from "./config";

import { dbWikiTextToHtml, isElementInViewport } from "./helpers";
import { Node, Tree } from "./node";

var tree: Tree | null;
var selectedNode: Node | null;
var audioEl: HTMLAudioElement;
var sourceEl: HTMLSourceElement;
var cache = new Map<string, string>();
var playContinuously = false;

let onFirstMount = () => {
  audioEl = document.createElement("audio");
  sourceEl = document.createElement("source");
  audioEl.appendChild(sourceEl);
  const content = document.querySelector("#audioContent")!;
  content.appendChild(audioEl);

  var db = firebase.firestore();
  var docRef = db.collection("pages").doc("8kOeJ93vCQVlC01UBZ6Z");

  docRef.get().then((doc) => {
    const content = page.pageEl;
    if (doc.exists) {
      tree = dbWikiTextToHtml(doc.get("body"));
      if (tree != null && tree.root != null) {
        page.pageEl.appendChild(tree.root.container);
      }
      if (tree && tree.root) {
        selectedNode = tree.root.findNext()
        if (selectedNode != null) {
          selectedNode.container.className = "selected";
        }
      }
    } else {
      // doc.data() will be undefined in this case
      content.innerHTML = "No such document!";
    }
  }).catch((error) => {
    console.log("Error getting document:", error);
  });

  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (tree == null) {
      return;
    }
    const keyName = event.key;

    if (keyName === "Control") {
      // do not alert when only Control key is pressed.
      return;
    }

    if (event.ctrlKey) {
      // Even though event.key is not "Control" (e.g., "a" is pressed),
      // event.ctrlKey may be true if Ctrl key is pressed at the same time.
      alert(`Combination of ctrlKey + ${keyName}`);
    } else {
      if (keyName === " ") {
        event.preventDefault();
        repeat();
      } else if (keyName === "p") {
        event.preventDefault();
        cmdPlay();
      } else if (keyName === "h") {
        event.preventDefault();
        cmdPrev();
      } else if (keyName === "l") {
        event.preventDefault();
        cmdNext();
      } else if (keyName === "j") {
        event.preventDefault();
        cmdNextPara();
      } else if (keyName === "k") {
        event.preventDefault();
        cmdPrevPara();
      }
    }
  }, false);
  audioEl.addEventListener("ended", () => {
    if (playContinuously) {
      cmdNext();
    }
  });
  const playBtn = document.querySelector(".toolbarButtons .play");
  if (playBtn) {
    playBtn.addEventListener("click", (e: Event) => {
      e.preventDefault();
      cmdPlay();
      playBtn.innerHTML = playContinuously ? "Pause" : "Play";
    });
  }
};

function cmdPlay() {
  if (playContinuously) {
    playContinuously = false;
    audioEl.pause();
  } else {
    playContinuously = true;
    selectNodeAndSpeak();
  }
}

function cmdPrevPara() {
  if (tree == null) {
    return;
  }
  if (selectedNode) {
    selectedNode.container.className = "";
    selectedNode = selectedNode.findPrevLevelUp();
  } else {
    if (tree.root) {
      selectedNode = tree.root.findNext();
    }
  }
  selectNodeAndSpeak();
}

function cmdNextPara() {
  if (tree == null) {
    return;
  }
  if (selectedNode) {
    selectedNode.container.className = "";
    selectedNode = selectedNode.findNextLevelUp();
  } else {
    if (tree.root) {
      selectedNode = tree.root.findNext();
    }
  }
  selectNodeAndSpeak();
}

function cmdPrev() {
  if (tree == null) {
    return;
  }
  if (selectedNode) {
    selectedNode.container.className = "";
    selectedNode = selectedNode.findPrev();
  } else {
    if (tree.root) {
      selectedNode = tree.root.findNext();
    }
  }
  selectNodeAndSpeak();
}

function cmdNext() {
  if (tree == null) {
    return;
  }
  if (selectedNode) {
    selectedNode.container.className = "";
    selectedNode = selectedNode.findNext();
  } else {
    if (tree.root) {
      selectedNode = tree.root.findNext();
    }
  }
  selectNodeAndSpeak(selectedNode?.addPause ? 2000 : 500);
}

function selectNodeAndSpeak(pause: number = 500) {
  if (selectedNode) {
    selectedNode.container.className = "selected";
    if (!isElementInViewport(selectedNode.container)) {
      selectedNode.container.scrollIntoView({ behavior: "smooth", inline: "nearest" });
    }

    let currentVoice = "en-US-Wavenet-J";
    if (selectedNode.voiceName.length > 0) {
      switch (selectedNode.voiceName) {
        // "en-US-Wavenet-G"; break;
        case "LAUREN": currentVoice = "en-US-Wavenet-H"; break;
        case "SARAH": currentVoice = "en-US-Wavenet-F"; break;
      }
    }
    if (selectedNode.skipNode) {
      cmdNext();
      return;
    }
    
    const text = selectedNode.container.innerText;
    setTimeout(() => {
      sayText(currentVoice, text);
    }, pause);
  }
}

function repeat() {
  audioEl.play();
}

function sayText(name: string, text: string) {
  let hash = Md5.hashAsciiStr(name + "|" + text);
  audioEl.pause();
  if (cache.has(hash)) {
    let src = String(cache.get(hash));
    sourceEl.src = src;
    sourceEl.type = "audio/mpeg";
    audioEl.load();
    audioEl.play().catch(err => {
      console.log(err)
    });
    return;
  }
  const synthesizeText = firebase.functions().httpsCallable("synthesizeText")
  synthesizeText({ hash, text, name})
    .then((data) => {
      cache.set(hash, data.data);
      sourceEl.src = data.data;
      sourceEl.type = "audio/mpeg";
      audioEl.load();
      audioEl.play().catch(err => {
        console.log(err)
      });
    }).catch(err => {
      console.log(err)
    });
}

const page = new Page('page-study', true, onFirstMount, () => {
});

export default page;