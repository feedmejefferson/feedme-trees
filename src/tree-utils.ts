import { TreeExpansion, TreeIndex } from "./types";

const MAX_DEPTH = 30;
const MAX_INDEX = 1 << (MAX_DEPTH + 1) -1;

/**
 * Checks if a branch is valid -- as in it has full coverage and no missing t
 * terminal nodes. This could be an expensive operation for large branches, so 
 * you probably don't want to run it too often. It's probably good to use this 
 * for validating trees when we build them as static files though.
 * 
 * @param {TreeIndex} t the tree to validate
 * @param {number} b the branch of the tree to validate 
 * @returns {boolean} if the branch is valid
 */

const validateBranch = (t: TreeIndex, b: number): boolean => {
  // pass if the branch is a node in the tree
  if (t[`${b}`]) {
    return true;
  }
  // fail if we've exceeded the max depth
  if(b>MAX_INDEX) {
    return false;
  }
  // check both of the sub branches recursively
  return(validateBranch(t,b*2) && validateBranch(t,b*2+1));
}

export const validateTree = (t: TreeIndex): boolean => {
  // check if the root branch is valid
  return validateBranch(t,1);
}

/**
 * Expands a tree index by replacing each of the expanded branches with 
 * the new nodes specified in the tree expansion.
 * 
 * @param {TreeIndex} t the tree to expand
 * @param {TreeExpansion} tx an associative list of branches with their 
 * expansions
 * @return {TreeIndex} an expanded tree index object
 */
export const expandTree = (t: TreeIndex, tx: TreeExpansion): TreeIndex => {
  const expanded = {...t};
  for(const bx in tx) {
    if(!tx.hasOwnProperty(bx)) { continue }
    delete expanded[bx];
    for(const b in tx[bx]) {
      if(!tx[bx].hasOwnProperty(b)) { continue }
      expanded[b]=tx[bx][b];
    }
  }
  return expanded;
}

export const maxDepth = (t: TreeIndex, b: number): number => {
  if (t[`${b}`]) {
    return 0;
  }
  return(Math.max(maxDepth(t,b*2)+1, maxDepth(t,b*2+1)+1));
}

export const relativeAt = (t: TreeIndex, b: number, rb: number): number => {
  // we can't mod something with 0, so we have to use a minimum depth of 1
  // this will mean treating rb=0 the same as 2 and rb=1 the same as 3.
  const depth = Math.max(Math.floor(Math.log2(rb)), 1);
  let n = b;
  for(let i = 1; n<=MAX_INDEX && i<MAX_DEPTH; i++) {
    if (t[`${n}`]) { return(n) }
    const shift = i % depth; 
    n *= 2;
    n = n + ((rb>>shift) & 1);
  }
  return null;
}

export const branchNodes = (t: TreeIndex, b: number): TreeIndex => {
  if (t[`${b}`]) {
    const r = {};
    r[`${b}`]=t[`${b}`];
    return r;
  }
  const lb = branchNodes(t,b*2);
  const rb = branchNodes(t,b*2+1);
  return{...lb, ...rb};
}
