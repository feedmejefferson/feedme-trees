import { SplitTree, TreeExpansion, TreeIndex, TreeLike } from "./types";

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

const validateBranch = (t: TreeLike<any>, b: number): boolean => {
  // pass if the branch is a node in the tree
  if (t[b]) {
    return true;
  }
  // fail if we've exceeded the max depth
  if(b>MAX_INDEX) {
    return false;
  }
  // check both of the sub branches recursively
  return(validateBranch(t,b*2) && validateBranch(t,b*2+1));
}

export const validateTree = (t: TreeLike<any>): boolean => {
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

export const maxDepth = (t: TreeLike<any>, b: number): number => {
  if (t[b] || b>MAX_INDEX) {
    return 0;
  }
  return(Math.max(maxDepth(t,b*2)+1, maxDepth(t,b*2+1)+1));
}

export const depth = (b: number): number => Math.floor(Math.log2(b));

export const ancestor = (t: TreeLike<any>, b: number): number => {
  while(b>0) {
    if(t[b]) { return b }
    b = b >> 1;
  }
}

export const relativeAt = (t: TreeLike<any>, b: number, rb: number): number => {
  // we can't mod something with 0, so we have to use a minimum depth of 1
  // this will mean treating rb=0 the same as 2 and rb=1 the same as 3.
  const d = Math.max(depth(rb), 1);
  let n = b;
  for(let i = 1; n<=MAX_INDEX && i<MAX_DEPTH; i++) {
    if (t[n]) { return(n) }
    const shift = i % d; 
    n *= 2;
    n = n + ((rb>>shift) & 1);
  }
  return null;
}

export function branchNodes<T>(t: TreeLike<T>, b: number): TreeLike<T> {
  if (t[b]) {
    const r = {};
    r[b]=t[b];
    return r;
  }
  const lb = branchNodes(t,b*2);
  const rb = branchNodes(t,b*2+1);
  return{...lb, ...rb};
}

const pruneBranch = (t: TreeIndex, b: number, d: number, f: number, s: number): SplitTree => {
  /* 
  run a depth first traversal until we reach a branch with max depth of f + d 
  at which point we prune everything deeper than d and replace it with s(d)
  (more or less)
  */
  if(maxDepth(t,b)<=(f)) { // TODO: huh? should this be or d or f?
    return {core:branchNodes(t,b)}
  }

  let core = {};

  const l = b*2;
  const r = l+1;
  const lb = pruneBranch(t, l, d, f, s);
  const rb = pruneBranch(t, r, d, f, s);
  const lc = lb.core;  // branch expansion for l
  const rc = rb.core;  // branch expansion for r
  const prunedBranch = {...lb, ...rb, core };

  if(depth(b)>d-2) {  // TODO: huh? should this be d or f?
    const tx: TreeExpansion = {}
    // Including minimum size check to account for empty core object
    // until we fix max depth implementation
    if(maxDepth(lc,l)>=f) {
      const lr = lc[relativeAt(lc,l,s)];
      tx[l]=lc;
      core[l]=lr;
    } else {
      core = {...core, ...lc}
    }
    if(maxDepth(rc,r)>=f) {
      const rr = rc[relativeAt(rc,r,s)];
      tx[r]=rc;
      core[r]=rr;
    } else {
      core = {...core, ...rc}
    }
    // TODO: I feel like there's a better way to handle this...
    if(Object.keys(tx).length>0) {
      prunedBranch[b]=tx;
    }

  } else {
    core = {...lc,...rc}
  }
  prunedBranch.core=core;

  return prunedBranch;

}

/**
 * Splits a full tree index up into a smaller representation of the tree
 * followed by a number of expansion baskets. The return value includes 
 * the key `core` with the minimimized representation of the full index, as
 * well as numeric keys indicating branches at which point the tree can 
 * be expanded using @see #expandTree. Note, @see TreeExpansion objects
 * should only be applied after the application of any ancestor node 
 * expansions.
 * 
 * **Note**, this is an initial implementation that is subject to change.
 * In particular, the relationship between depth and frequency and how
 * they are specified has likely room for improvement. Expansion size
 * probably makes more sense, but depth was easier to reason through for
 * a first attempt.  
 * 
 * @param {TreeIndex} t the `tree` to be split 
 * @param {number} d the minimum `depth` of collapsed (representative) branches
 * in the returned core tree index.
 * @param {number} f the `frequency` with which the tree should be expanded
 * @param {number} s a number indicating `strategy` to use for selecting 
 * representative nodes for collapsed branches. The number indicates the
 * relative sub branch of the collapsed branch that should be searched to 
 * find a represetative child node. @see #relativeAt
 * 
 * @return {SplitTree} a separated and expandable tree
 */
export const splitTree = (t: TreeIndex, d: number, f=1, s=0): SplitTree => {
  return pruneBranch(t, 1, d, f, s);
}
