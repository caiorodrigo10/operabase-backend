export const getTextContent = (element: HTMLElement): string => {
  return element.textContent || '';
};

export const setTextContent = (element: HTMLElement, text: string): void => {
  element.textContent = text;
};

export const isTextNode = (node: Node): node is Text => {
  return node.nodeType === Node.TEXT_NODE;
};

export const getTextSelection = (): Selection | null => {
  return window.getSelection();
};

export const selectText = (element: HTMLElement): void => {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection?.removeAllRanges();
  selection?.addRange(range);
};

export const insertTextAtCursor = (text: string): void => {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

export const getCaretPosition = (element: HTMLElement): number => {
  let caretOffset = 0;
  const selection = window.getSelection();
  
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    caretOffset = preCaretRange.toString().length;
  }
  
  return caretOffset;
};

export const setCaretPosition = (element: HTMLElement, position: number): void => {
  const range = document.createRange();
  const selection = window.getSelection();
  
  let textNode = element.firstChild;
  let offset = position;
  
  while (textNode && offset > 0) {
    if (textNode.nodeType === Node.TEXT_NODE) {
      const textLength = textNode.textContent?.length || 0;
      if (offset <= textLength) {
        range.setStart(textNode, offset);
        range.setEnd(textNode, offset);
        break;
      }
      offset -= textLength;
    }
    textNode = textNode.nextSibling;
  }
  
  if (textNode) {
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const weightDescription = (weight: number): string => {
  const weights: { [key: number]: string } = {
    100: 'Thin',
    200: 'Extra Light',
    300: 'Light',
    400: 'Normal',
    500: 'Medium',
    600: 'Semi Bold',
    700: 'Bold',
    800: 'Extra Bold',
    900: 'Black'
  };
  
  return weights[weight] || 'Normal';
};