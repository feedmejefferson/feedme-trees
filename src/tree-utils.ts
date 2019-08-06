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

const buildBranch = (t: TreeIndex, b: number, d: number): TreeIndex => {
  const start = b << d; // times 2^d
  const end = start + (1 << (d)); // start plus 2^d
  const core = {}
  for(let i = start;i<end;i++) {
    if(t[i]) { 
      core[i]=t[i]
    } else if(ancestor(t,i)) {
      const a = ancestor(t,i);
      core[a]=t[a]
    } else {
      core[i] = t[relativeAt(t,i,0)]
    }
  }
  return core;
}

const buildBasket = (t: TreeIndex, b: number, e: number, f: number): TreeExpansion => {
  const start = b << e; // times 2^e
  const end = start + (1 << e); // start plus 2^(e-1)
  const basket = {}
  for(let i = start;i<end;i++) {
    if(ancestor(t,i)) { continue } // we don't need to expand this branch
    const branch = buildBranch(t, i, f);
    basket[i]=branch;
  }
  return basket;
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
 * @param {number} e the `eagerness` or depth at which baskets should look 
 * forward when expanding branches.
 * @param {number} f the `frequency` with which the tree should be expanded
 * @param {number} s a number indicating `strategy` to use for selecting 
 * representative nodes for collapsed branches. The number indicates the
 * relative sub branch of the collapsed branch that should be searched to 
 * find a represetative child node. @see #relativeAt
 * 
 * @return {SplitTree} a separated and expandable tree
 */
export const splitTree = (t: TreeIndex, e: number, f=1): SplitTree => {
  //  return pruneBranch(t, 1, d, f, s);
  
  const core = buildBranch(t,1,e);
  const split = {core};
  const maxIndex = Object.keys(t)
    .map(x=>parseInt(x))
    .reduce((p,c)=>Math.max(p,c));
  const maxBasket = maxIndex >> (e+f-1);  // we should never have to go deeper 
  for(let b=1;b<maxBasket;b++) {
    if(b & (b-1)) { // b is an exact power of 2
      /* 
      this is a bit convoluted, but we only want to build baskets where
      the branch depth is a multiple of the frequency. We don't need to 
      build and expansion for branch 1, that's already taken care of with 
      the core basket. If the frequency is one, we basically have to build
      expansions for every branch after 1 until the last one. For frequency
      of two, we need to build them for branches 4-7, then skip 16-31, then
      64-127... To do this, we're running a simple loop that increments 
      the branch by one every cycle, but when it is an exact power of two,
      we shift it by the frequency minus one (running through the last)
      set of branches has already shifted it by one, so we only need to
      shift it the rest of the way to get to the start of the next branch
      depth cycle. If the frequency is 1, this does nothing.
      */ 
      b=b<<(f-1); 
    } 
    const basket = buildBasket(t, b, e, f)
    if(Object.keys(basket).length>0) {
      split[b]=basket;
    }
  }

  return split;
}
