import { TreeIndex } from "./types";

const maxDepth = 30;
const maxIndex = 1 << (maxDepth + 1) -1;

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
  if(b>maxIndex) {
    return false;
  }
  // check both of the sub branches recursively
  return(validateBranch(t,b*2) && validateBranch(t,b*2+1));
}

export const validateTree = (t: TreeIndex): boolean => {
  // check if the root branch is valid
  return validateBranch(t,1);
}