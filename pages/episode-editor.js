(() => {
  const allowedTags = new Set([
    "A", "B", "BLOCKQUOTE", "BR", "DEL", "EM", "H1", "H2", "H3", "H4", "H5", "H6",
    "FONT", "I", "LI", "OL", "P", "S", "SPAN", "STRONG", "U", "UL"
  ]);
  const blockTags = new Set(["BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "OL", "P", "UL"]);
  const blockedTags = new Set(["IFRAME", "OBJECT", "SCRIPT", "STYLE", "SVG"]);
  const fontFamilies = new Set(["Arial", "Georgia", "Times New Roman", "Verdana", "Courier New", "Lora"]);
  const fontSizes = new Set(["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px"]);
  const namedColors = new Set(["black", "blue", "gray", "green", "orange", "purple", "red", "white", "yellow"]);
  let savedRange = null;

  function safeColor(value) {
    const color = String(value || "").trim().toLowerCase();
    return /^#[0-9a-f]{3,8}$/i.test(color) ||
      /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+)?\s*\)$/i.test(color) ||
      namedColors.has(color) ? color : "";
  }

  function safeFontSize(value) {
    const size = String(value || "").trim().toLowerCase();
    return fontSizes.has(size) ? size : "";
  }

  function safeFontFamily(value) {
    const family = String(value || "").replace(/["']/g, "").split(",")[0].trim();
    return Array.from(fontFamilies).find(item => item.toLowerCase() === family.toLowerCase()) || "";
  }

  function normalizeGoogleDriveImageUrl(value) {
    const url = String(value || "").trim();
    if (!url) return url;
    const hostMatch = url.match(/^https?:\/\/([^/?#]+)/i);
    if (!hostMatch || !/(^|\.)drive\.google\.com$/i.test(hostMatch[1])) return url;
    const pathMatch = url.match(/\/file\/d\/([^/?#]+)/i) || url.match(/\/d\/([^/?#]+)/i);
    const queryMatch = url.match(/[?&]id=([^&#]+)/i);
    const fileId = pathMatch ? pathMatch[1] : queryMatch ? queryMatch[1] : "";
    return fileId
      ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200`
      : url;
  }

  function cleanEpisodeHTML(value) {
    const source = new DOMParser().parseFromString(String(value || ""), "text/html");
    const output = document.createElement("div");

    function copyNode(node, parent) {
      if (node.nodeType === Node.TEXT_NODE) {
        parent.appendChild(document.createTextNode(node.nodeValue || ""));
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const sourceTag = node.tagName.toUpperCase();
      if (blockedTags.has(sourceTag)) return;
      const tag = sourceTag === "DIV" ? "P" : sourceTag === "FONT" ? "SPAN" : sourceTag;
      if (!allowedTags.has(tag)) {
        Array.from(node.childNodes).forEach(child => copyNode(child, parent));
        return;
      }

      const hasBlockChild = Array.from(node.children).some(child =>
        blockTags.has(child.tagName.toUpperCase()) || child.tagName.toUpperCase() === "DIV"
      );
      if (sourceTag === "DIV" && hasBlockChild) {
        Array.from(node.childNodes).forEach(child => copyNode(child, parent));
        return;
      }

      const clean = document.createElement(tag.toLowerCase());
      if (tag === "A") {
        const href = (node.getAttribute("href") || "").trim();
        if (/^(https?:|mailto:|tel:|\/|#)/i.test(href)) clean.setAttribute("href", href);
      }

      const style = node.style || {};
      const color = safeColor(style.color || (sourceTag === "FONT" ? node.getAttribute("color") : ""));
      const legacyFontSize = { "1": "12px", "2": "14px", "3": "16px", "4": "18px", "5": "24px", "6": "32px", "7": "36px" };
      const fontSize = safeFontSize(style.fontSize || (sourceTag === "FONT" ? legacyFontSize[node.getAttribute("size")] : ""));
      const fontFamily = safeFontFamily(style.fontFamily || (sourceTag === "FONT" ? node.getAttribute("face") : ""));
      if (color) clean.style.color = color;
      if (fontSize) clean.style.fontSize = fontSize;
      if (fontFamily) clean.style.fontFamily = fontFamily;
      if (blockTags.has(tag)) {
        const align = String(style.textAlign || "").toLowerCase();
        if (["left", "right", "center", "justify"].includes(align)) clean.style.textAlign = align;
      }

      Array.from(node.childNodes).forEach(child => copyNode(child, clean));
      const text = clean.textContent.replace(/\u00a0/g, " ").trim();
      if (tag !== "BR" && !text && (blockTags.has(tag) || !clean.querySelector("br"))) return;
      if (tag === "SPAN" && !clean.hasAttribute("style")) {
        Array.from(clean.childNodes).forEach(child => parent.appendChild(child));
        return;
      }
      if (tag === "SPAN" && clean.childNodes.length === 1 &&
          clean.firstElementChild?.tagName === "SPAN") {
        const child = clean.firstElementChild;
        ["color", "fontSize", "fontFamily"].forEach(property => {
          if (!child.style[property] && clean.style[property]) child.style[property] = clean.style[property];
        });
        parent.appendChild(child);
        return;
      }
      parent.appendChild(clean);
    }

    Array.from(source.body.childNodes).forEach(node => copyNode(node, output));
    const normalized = document.createElement("div");
    let inlineContent = document.createElement("p");
    const flushInlineContent = () => {
      if (inlineContent.textContent.replace(/\u00a0/g, " ").trim() || inlineContent.querySelector("br")) {
        normalized.appendChild(inlineContent);
      }
      inlineContent = document.createElement("p");
    };
    Array.from(output.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE && blockTags.has(node.tagName.toUpperCase())) {
        flushInlineContent();
        normalized.appendChild(node);
      } else {
        inlineContent.appendChild(node);
      }
    });
    flushInlineContent();
    return normalized.innerHTML.trim();
  }

  function editorRange(editor) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    return editor.contains(range.commonAncestorContainer) ? range : null;
  }

  function restoreEditorSelection(editor) {
    const selection = window.getSelection();
    if (!selection || !savedRange || !editor.contains(savedRange.commonAncestorContainer)) return false;
    selection.removeAllRanges();
    selection.addRange(savedRange);
    return true;
  }

  function selectedBlocks(editor, range) {
    const candidates = Array.from(editor.querySelectorAll("p,h1,h2,h3,h4,h5,h6,blockquote,li"));
    const matches = candidates.filter(block => {
      try {
        return range.collapsed
          ? block.contains(range.startContainer)
          : range.intersectsNode(block);
      } catch (error) {
        return false;
      }
    });
    if (matches.length) return matches.filter(block => !matches.some(parent => parent !== block && parent.contains(block)));
    const block = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer.closest?.("p,h1,h2,h3,h4,h5,h6,blockquote,li")
      : range.startContainer.parentElement?.closest("p,h1,h2,h3,h4,h5,h6,blockquote,li");
    return block && editor.contains(block) ? [block] : [];
  }

  function replaceBlockTag(block, tagName) {
    if (block.tagName === "LI") {
      const replacement = document.createElement(tagName);
      while (block.firstChild) replacement.appendChild(block.firstChild);
      block.replaceChildren(replacement);
      return replacement;
    }
    const replacement = document.createElement(tagName);
    while (block.firstChild) replacement.appendChild(block.firstChild);
    if (block.style.textAlign) replacement.style.textAlign = block.style.textAlign;
    block.replaceWith(replacement);
    return replacement;
  }

  function selectionOffsets(editor) {
    const range = editorRange(editor);
    if (!range) return null;
    const beforeStart = range.cloneRange();
    beforeStart.selectNodeContents(editor);
    beforeStart.setEnd(range.startContainer, range.startOffset);
    const beforeEnd = range.cloneRange();
    beforeEnd.selectNodeContents(editor);
    beforeEnd.setEnd(range.endContainer, range.endOffset);
    return { start: beforeStart.toString().length, end: beforeEnd.toString().length };
  }

  function applyInlineStyle(editor, range, property, value) {
    const textNodes = [];
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) {
      if (!range.intersectsNode(textNode)) continue;
      const start = range.startContainer === textNode ? range.startOffset : 0;
      const end = range.endContainer === textNode ? range.endOffset : textNode.length;
      if (end > start) textNodes.push({ node: textNode, start, end });
    }
    textNodes.reverse().forEach(({ node, start, end }) => {
      const selected = node.splitText(start);
      selected.splitText(end - start);
      const wrapper = document.createElement("span");
      wrapper.style[property] = value;
      selected.replaceWith(wrapper);
      wrapper.appendChild(selected);
    });
  }

  function restoreSelectionOffsets(editor, offsets) {
    if (!offsets) return;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let startNode = null;
    let endNode = null;
    let startOffset = 0;
    let endOffset = 0;
    let position = 0;
    let textNode;
    while ((textNode = walker.nextNode())) {
      const nextPosition = position + textNode.nodeValue.length;
      if (!startNode && offsets.start <= nextPosition) {
        startNode = textNode;
        startOffset = Math.max(0, offsets.start - position);
      }
      if (!endNode && offsets.end <= nextPosition) {
        endNode = textNode;
        endOffset = Math.max(0, offsets.end - position);
        break;
      }
      position = nextPosition;
    }
    if (!startNode || !endNode) {
      editor.focus();
      return;
    }
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
  }

  function formatEpisodeText(command, value, editorId = "episode-editor") {
    const editor = document.getElementById(editorId);
    if (!editor) return;
    editor.focus();
    restoreEditorSelection(editor);
    const selection = window.getSelection();
    const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
    if (!range || !editor.contains(range.commonAncestorContainer)) return;
    const offsets = selectionOffsets(editor);

    if (command === "heading") {
      const tagName = String(value || "").toUpperCase();
      if (!/^H[1-6]$/.test(tagName)) return;
      selectedBlocks(editor, range).forEach(block => replaceBlockTag(block, tagName));
    } else if (command === "align") {
      selectedBlocks(editor, range).forEach(block => {
        block.style.textAlign = ["left", "right", "center", "justify"].includes(value) ? value : "";
      });
    } else if (command === "fontSize" || command === "fontName" || command === "foreColor") {
      if (range.collapsed) return;
      const style = {
        fontSize: ["fontSize", safeFontSize(value)],
        fontName: ["fontFamily", safeFontFamily(value)],
        foreColor: ["color", safeColor(value)]
      }[command];
      if (style[1]) applyInlineStyle(editor, range, style[0], style[1]);
    } else if (command === "clearFormat") {
      const blocks = selectedBlocks(editor, range);
      document.execCommand("removeFormat", false);
      blocks.forEach(block => {
        block.style.textAlign = "";
        if (/^H[1-6]$/.test(block.tagName)) replaceBlockTag(block, "P");
      });
    } else {
      document.execCommand(command, false, value || null);
    }

    const cleaned = cleanEpisodeHTML(editor.innerHTML);
    editor.innerHTML = cleaned;
    restoreSelectionOffsets(editor, offsets);
  }

  function isEpisodeContentEmpty(value) {
    const text = new DOMParser().parseFromString(String(value || ""), "text/html").body.textContent || "";
    return text.replace(/\u00a0/g, " ").trim().length === 0;
  }

  document.addEventListener("selectionchange", () => {
    const editor = document.getElementById("episode-editor");
    const range = editor && editorRange(editor);
    if (range) savedRange = range.cloneRange();
  });

  window.cleanEpisodeHTML = cleanEpisodeHTML;
  window.formatEpisodeText = formatEpisodeText;
  window.isEpisodeContentEmpty = isEpisodeContentEmpty;
  window.normalizeGoogleDriveImageUrl = normalizeGoogleDriveImageUrl;
})();
